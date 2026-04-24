const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const Store = require('electron-store');
const store = new Store();

function findUVLMJar() {
    const candidates = [
        // 1. App instalado/empacotado
        path.join(process.resourcesPath, 'uvlm', 'Main.jar'),

        // 2. Ao lado do executável
        path.join(path.dirname(app.getPath('exe')), 'uvlm', 'Main.jar'),

        // 3. Desenvolvimento local — vários layouts possíveis
        path.join(__dirname, '../../../Main.jar'),        // Upperzetta/Main.jar
        path.join(__dirname, '../../../uvlm/Main.jar'),   // Upperzetta/uvlm/Main.jar
        path.join(__dirname, '../../Main.jar'),           // zettasource-ide/Main.jar
        path.join(__dirname, '../../uvlm/Main.jar'),      // zettasource-ide/uvlm/Main.jar

        // 4. Configuração manual do usuário
        store.get('uvlm.jarPath')
    ].filter(Boolean);

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            console.log('[UVLM] JAR encontrado em:', candidate);
            return candidate;
        }
    }

    return null;
}

function detectJava() {
    return new Promise((resolve) => {
        const proc = spawn('java', ['-version'], { stdio: 'pipe' });
        let output = '';
        proc.stderr.on('data', d => output += d.toString());
        proc.on('close', code => {
            if (code === 0) {
                const match = output.match(/version "([^"]+)"/);
                resolve({ found: true, version: match ? match[1] : 'desconhecida' });
            } else {
                resolve({ found: false, version: null });
            }
        });
        proc.on('error', () => resolve({ found: false, version: null }));
    });
}

class UVLMRunner {
    constructor(webContents) {
        this.wc = webContents;
        this.jar = null;
        this.proc = null;
    }

    async init() {
        const java = await detectJava();
        if (!java.found) {
            this.emit('ERROR', 'Java não encontrado. Instale o JDK 17+ em https://adoptium.net');
            this.emit('ERROR', 'Após instalar, reinicie o ZettaSource.');
            return false;
        }
        this.emit('BUILD', `Java ${java.version} detectado ✓`);

        this.jar = findUVLMJar();
        if (!this.jar) {
            this.emit('ERROR', 'UVLM não encontrado. Verifique se o Main.jar existe.');
            return false;
        }

        this.emit('BUILD', `UVLM pronto (${path.basename(this.jar)})`);
        return true;
    }

    emit(type, text) {
        if (!this.wc.isDestroyed()) {
            this.wc.send('uvlm:output', { type, text });
        }
    }

    setStatus(status) {
        if (!this.wc.isDestroyed()) {
            this.wc.send('uvlm:status', status);
        }
    }

    async compile(filePath) {
        if (!this.jar) {
            const ok = await this.init();
            if (!ok) return null;
        }

        return new Promise((resolve, reject) => {
            this.setStatus('building');
            this.emit('BUILD', `Compilando ${path.basename(filePath)}...`);

            const proc = spawn('java', ['-cp', this.jar, 'Main', 'build', filePath], {
                cwd: path.dirname(filePath)
            });

            proc.stdout.on('data', d => this.emit('BUILD', d.toString().trim()));
            proc.stderr.on('data', d => this.emit('ERROR', d.toString().trim()));

            proc.on('close', code => {
                if (code === 0) {
                    const uzb = filePath.replace(/\.uz[s]?$/, '.uzb');
                    this.emit('BUILD', `✓ Compilado → ${path.basename(uzb)}`);
                    this.setStatus('idle');
                    resolve(uzb);
                } else {
                    this.emit('ERROR', `Compilação falhou (exit ${code})`);
                    this.setStatus('error');
                    reject(code);
                }
            });
        });
    }

    async run(uzbPath) {
        if (!this.jar) return;

        this.proc = spawn('java', ['-cp', this.jar, 'Main', 'run', uzbPath], {
            cwd: path.dirname(uzbPath)
        });

        this.setStatus('running');
        this.emit('RUN', `Executando ${path.basename(uzbPath)}...`);
        this.emit('RUN', '─'.repeat(40));

        this.proc.stdout.on('data', d => this.emit('RUN', d.toString().trim()));
        this.proc.stderr.on('data', d => this.emit('ERROR', d.toString().trim()));

        this.proc.on('close', code => {
            this.emit('RUN', '─'.repeat(40));
            this.emit('EXIT', `Processo encerrado com código ${code}`);
            this.setStatus(code === 0 ? 'idle' : 'error');
            this.proc = null;
        });
    }

    async buildAndRun(filePath) {
        try {
            const uzbPath = await this.compile(filePath);
            if (uzbPath) await this.run(uzbPath);
        } catch (e) { /* error emitted */ }
    }

    stop() {
        if (this.proc) {
            this.proc.kill('SIGTERM');
            this.emit('EXIT', 'Execução interrompida pelo usuário');
            this.setStatus('idle');
            this.proc = null;
        }
    }
}

module.exports = { UVLMRunner, findUVLMJar, detectJava };
