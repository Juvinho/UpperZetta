/**
 * ZettaSource — Gerador de ícones para o build Windows.
 *
 * Requisitos (opcional para geração automática):
 *   npm install -D sharp to-ico
 *
 * Uso:
 *   1) Coloque sua arte em build-resources/icon.svg (ou icon.png)
 *   2) npm run setup:icons
 *
 * Saída esperada:
 *   build-resources/icon.png   (256×256)
 *   build-resources/icon.ico   (multi-resolução)
 */

const fs = require("fs");
const path = require("path");

async function generateFromSvgOrPng() {
  const svgPath = path.join(__dirname, "icon.svg");
  const pngPath = path.join(__dirname, "icon.png");
  const outIco = path.join(__dirname, "icon.ico");

  if (!fs.existsSync(svgPath) && !fs.existsSync(pngPath)) {
    console.log("Nenhum icon.svg ou icon.png encontrado em build-resources/. Coloque seu logo lá e rode 'npm run setup:icons'.");
    process.exit(0);
  }

  let sharp;
  let toIco;
  try {
    sharp = require("sharp");
    toIco = require("to-ico");
  } catch (e) {
    console.log("Para gerar icon.ico automaticamente, instale as dependências:");
    console.log("  npm install -D sharp to-ico");
    console.log("Depois rode novamente: npm run setup:icons");
    process.exit(0);
  }

  try {
    let inputBuffer;
    if (fs.existsSync(svgPath)) {
      inputBuffer = fs.readFileSync(svgPath);
    } else {
      inputBuffer = fs.readFileSync(pngPath);
    }

    // ensure a 256x256 PNG exists
    const png256 = await sharp(inputBuffer).resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    fs.writeFileSync(pngPath, png256);

    const sizes = [16, 24, 32, 48, 64, 128, 256];
    const buffers = await Promise.all(sizes.map((s) => sharp(png256).resize(s, s).png().toBuffer()));
    const icoBuffer = await toIco(buffers);
    fs.writeFileSync(outIco, icoBuffer);

    console.log(`Gerado: ${pngPath}`);
    console.log(`Gerado: ${outIco}`);
  } catch (err) {
    console.error("Erro ao gerar ícones:", err);
    process.exit(1);
  }
}

generateFromSvgOrPng();
