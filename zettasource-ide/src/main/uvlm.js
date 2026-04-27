const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const Store = require('electron-store');
const store = new Store();

function findUVLMJar() {
    const candidates = [
        path.join(process.resourcesPath, 'uvlm', 'Main.jar'),
        path.join(path.dirname(app.getPath('exe')), 'uvlm', 'Main.jar'),
        path.join(__dirname, '../../../Main.jar'),
        path.join(__dirname, '../../../uvlm/Main.jar'),
        path.join(__dirname, '../../Main.jar'),
        path.join(__dirname, '../../uvlm/Main.jar'),
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
        this.currentStatus = 'idle';
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

    clearOutput() {
        if (!this.wc.isDestroyed()) {
            this.wc.send('uvlm:clear');
        }
    }

    setStatus(status) {
        this.currentStatus = status;
        if (!this.wc.isDestroyed()) {
            this.wc.send('uvlm:status', status);
        }
    }

    // Compile .uz to .uzb.
    // NOTE: Main.jar doesn't have a compile-only mode — passing file.uz also runs it.
    // We capture stdout: "Compiled successfully to:" line → BUILD, rest → PROGRAM.
    async compile(filePath) {
        if (!this.jar) {
            const ok = await this.init();
            if (!ok) return null;
        }

        return new Promise((resolve, reject) => {
            this.clearOutput();
            this.setStatus('building');
            this.emit('BUILD', `Compilando ${path.basename(filePath)}...`);

            // Main.jar API: java Main <file.uz>  → compiles + runs
            //               java Main <file.uzb> → runs only
            const proc = spawn('java', ['-cp', this.jar, 'Main', filePath], {
                cwd: path.dirname(filePath)
            });

            proc.stdout.on('data', d => {
                d.toString().split('\n').forEach(line => {
                    if (!line.trim()) return;
                    const t = line.trimEnd();
                    // Compilation success message from Main.java
                    if (t.startsWith('Compiled successfully to:')) {
                        this.emit('BUILD', `✓ ${t.replace('Compiled successfully to:', 'Compilado →')}`);
                    } else {
                        // Program ran as side-effect of compile — show as PROGRAM
                        this.emit('PROGRAM', t);
                    }
                });
            });

            proc.stderr.on('data', d => {
                d.toString().split('\n').forEach(line => {
                    if (line.trim()) this.emit('ERROR', line.trimEnd());
                });
            });

            proc.on('close', code => {
                const uzb = filePath.replace(/\.uz$/, '.uzb');
                if (code === 0 && fs.existsSync(uzb)) {
                    this.setStatus('idle');
                    resolve(uzb);
                } else if (code === 0) {
                    // Compiled but .uzb might have a different name
                    this.setStatus('idle');
                    resolve(uzb);
                } else {
                    this.emit('ERROR', `Compilação falhou (exit ${code})`);
                    this.setStatus('error');
                    reject(new Error(`exit ${code}`));
                }
            });

            proc.on('error', err => {
                this.emit('ERROR', `Erro ao iniciar compilador: ${err.message}`);
                this.setStatus('error');
                reject(err);
            });
        });
    }

    // Run a pre-compiled .uzb file.
    // java Main file.uzb  → executes UVLM, stdout = System.print() output
    async run(uzbPath) {
        if (!this.jar) return;

        this.setStatus('running');
        this.emit('RUN', `▶ Executando ${path.basename(uzbPath)}...`);
        this.emit('RUN', '━'.repeat(50));

        this.proc = spawn('java', ['-cp', this.jar, 'Main', uzbPath], {
            cwd: path.dirname(uzbPath),
            env: { ...process.env }
        });

        // stdout = System.print() output from user program
        this.proc.stdout.on('data', d => {
            d.toString().split('\n').forEach(line => {
                if (line.trim()) this.emit('PROGRAM', line.trimEnd());
            });
        });

        // stderr = runtime errors
        this.proc.stderr.on('data', d => {
            d.toString().split('\n').forEach(line => {
                if (line.trim()) this.emit('ERROR', line.trimEnd());
            });
        });

        this.proc.on('close', code => {
            this.emit('RUN', '━'.repeat(50));
            this.emit(code === 0 ? 'EXIT' : 'ERROR',
                `Processo encerrado com código ${code}`);
            this.setStatus(code === 0 ? 'idle' : 'error');
            this.proc = null;
        });

        this.proc.on('error', err => {
            this.emit('ERROR', `Erro ao iniciar processo: ${err.message}`);
            this.setStatus('error');
        });
    }

    // Build .uz then run resulting .uzb as two separate Java invocations.
    // compile() does both phases via Main.jar's .uz handler, but we also
    // run separately so PROGRAM output is cleanly separated from BUILD.
    async buildAndRun(filePath) {
        if (!this.jar) {
            const ok = await this.init();
            if (!ok) return;
        }

        try {
            this.clearOutput();
            this.setStatus('building');
            this.emit('BUILD', `Compilando ${path.basename(filePath)}...`);

            // Phase 1: compile only (we intercept before UVLM runs by checking .uzb)
            const uzbPath = await this._compileOnly(filePath);
            if (!uzbPath) return;

            // Phase 2: run the .uzb
            await this.run(uzbPath);
        } catch (e) { /* already emitted */ }
    }

    // Compile .uz → .uzb without running the resulting bytecode.
    // Strategy: spawn java Main file.uz, capture stdout. Main.java outputs
    // "Compiled successfully to: xxx.uzb" then UVLM runs. We kill the proc
    // right after .uzb is confirmed created and compilation message received.
    _compileOnly(filePath) {
        return new Promise((resolve, reject) => {
            const uzbPath = filePath.replace(/\.uz$/, '.uzb');
            let compiled = false;

            const proc = spawn('java', ['-cp', this.jar, 'Main', filePath], {
                cwd: path.dirname(filePath)
            });

            proc.stdout.on('data', d => {
                const text = d.toString();
                text.split('\n').forEach(line => {
                    if (!line.trim()) return;
                    const t = line.trimEnd();
                    if (t.startsWith('Compiled successfully to:')) {
                        compiled = true;
                        this.emit('BUILD', `✓ Compilado → ${path.basename(uzbPath)}`);
                        // Kill process — we don't want UVLM to run here
                        // (run() will spawn a fresh process)
                        try { proc.kill('SIGTERM'); } catch (_) {}
                    } else if (!compiled) {
                        // Pre-compilation output (unusual)
                        this.emit('BUILD', t);
                    }
                    // Post-compilation UVLM output is discarded (we'll run separately)
                });
            });

            proc.stderr.on('data', d => {
                d.toString().split('\n').forEach(line => {
                    if (line.trim()) this.emit('ERROR', line.trimEnd());
                });
            });

            proc.on('close', code => {
                // code may be non-zero if we killed it after successful compile
                if (compiled || (code === 0 && fs.existsSync(uzbPath))) {
                    this.setStatus('idle');
                    resolve(uzbPath);
                } else {
                    this.emit('ERROR', `Compilação falhou (exit ${code})`);
                    this.setStatus('error');
                    reject(new Error(`exit ${code}`));
                }
            });

            proc.on('error', err => {
                this.emit('ERROR', `Erro ao iniciar compilador: ${err.message}`);
                this.setStatus('error');
                reject(err);
            });
        });
    }

    stop() {
        if (this.proc) {
            this.proc.kill('SIGTERM');
            this.emit('EXIT', 'Execução interrompida pelo usuário');
            this.setStatus('idle');
            this.proc = null;
        }
    }

    async getVersion() {
        if (!this.jar) return 'UVLM não encontrado';
        return new Promise(resolve => {
            let out = '';
            const proc = spawn('java', ['-cp', this.jar, 'Main', '--version'], { stdio: 'pipe' });
            proc.stdout.on('data', d => out += d.toString());
            proc.stderr.on('data', d => out += d.toString());
            proc.on('close', () => resolve(out.trim() || 'UpperZetta UVLM 1.0'));
            proc.on('error', () => resolve('UpperZetta UVLM 1.0'));
        });
    }

    // ── Crypto helpers (DeviceKey-based) ─────────────────────────────────────

    /** Spawn Java command without stdin interaction. */
    _runSimple(...args) {
        return new Promise(resolve => {
            const proc = spawn('java', ['-cp', this.jar, 'Main', ...args], { stdio: 'pipe' });
            let stdout = '', stderr = '';
            proc.stdout.on('data', d => stdout += d.toString());
            proc.stderr.on('data', d => stderr += d.toString());
            proc.on('close', code => resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code }));
            proc.on('error', err => resolve({ stdout: '', stderr: err.message, code: -1 }));
        });
    }

    /** Spawn Java command, write password to stdin, wait for exit. */
    _runWithPassword(command, filePath, password) {
        return new Promise((resolve, reject) => {
            const proc = spawn(
                'java',
                ['-cp', this.jar, 'Main', command, filePath],
                { cwd: path.dirname(filePath), stdio: 'pipe' }
            );
            let stdout = '', stderr = '';
            proc.stdout.on('data', d => stdout += d.toString());
            proc.stderr.on('data', d => stderr += d.toString());
            proc.stdin.write(password + '\n');
            proc.stdin.end();
            proc.on('close', code => resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code }));
            proc.on('error', reject);
        });
    }

    /**
     * Unseal a UZS1 (DeviceKey) file via Java.
     * Java writes <file>.uz to disk; we read it back and return { success, source, uzPath }.
     */
    async unsealFile(uzsPath, password) {
        if (!this.jar) return { success: false, error: 'UVLM não inicializado.' };
        const result = await this._runWithPassword('unseal', uzsPath, password);
        if (result.code !== 0) {
            const msg = result.stderr || result.stdout;
            if (result.code === 2 || /[Ss]enha|DEVICE KEY/i.test(msg)) {
                return { success: false, error: 'Senha incorreta ou DEVICE KEY diferente.' };
            }
            return { success: false, error: msg || `Java saiu com código ${result.code}` };
        }
        const uzPath = uzsPath.replace(/\.uzs$/, '.uz');
        try {
            const source = fs.readFileSync(uzPath, 'utf8');
            return { success: true, source, isBytecode: false, encoding: 'utf8', uzPath };
        } catch (e) {
            return { success: false, error: 'Arquivo .uz não foi criado: ' + e.message };
        }
    }

    /**
     * Seal a .uz file via Java (creates .uzs with DeviceKey).
     * If content is provided, writes it to a temp file first.
     */
    async sealFile(uzPath, password, content = null) {
        if (!this.jar) return { success: false, error: 'UVLM não inicializado.' };

        let tempPath = null;
        let targetUzPath = uzPath;

        if (content !== null) {
            // Write custom content to temp file so Java can read it
            tempPath = uzPath + '.__tmp__.uz';
            fs.writeFileSync(tempPath, content, 'utf8');
            targetUzPath = tempPath;
        }

        try {
            const result = await this._runWithPassword('seal', targetUzPath, password);
            if (result.code !== 0) {
                return { success: false, error: result.stderr || `exit ${result.code}` };
            }
            // Java creates file at targetUzPath.replace('.uz', '.uzs')
            const rawUzsPath = targetUzPath.replace(/\.uz$/, '.uzs');
            const finalUzsPath = uzPath.replace(/\.uz$/, '.uzs');
            if (tempPath && rawUzsPath !== finalUzsPath) {
                fs.renameSync(rawUzsPath, finalUzsPath);
            }
            return { success: true, uzsPath: finalUzsPath };
        } finally {
            if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }
    }

    /** Export DeviceKey to a file. */
    async keyExport(outputPath) {
        if (!this.jar) return { success: false, error: 'UVLM não inicializado.' };
        const r = await this._runSimple('key-export', outputPath);
        return { success: r.code === 0, output: r.stdout, error: r.stderr };
    }

    /** Import DeviceKey from a file. */
    async keyImport(keyFilePath) {
        if (!this.jar) return { success: false, error: 'UVLM não inicializado.' };
        const r = await this._runSimple('key-import', keyFilePath);
        return { success: r.code === 0, output: r.stdout, error: r.stderr };
    }

    /** Show current DeviceKey. */
    async keyShow() {
        if (!this.jar) return { success: false, key: null };
        const r = await this._runSimple('key-show');
        const match = r.stdout.match(/\[DEVICE KEY\]\s*(.+)/);
        return { success: r.code === 0, key: match ? match[1].trim() : r.stdout };
    }
}

module.exports = { UVLMRunner, findUVLMJar, detectJava };
