import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  // base "./" garante que os assets no build usem caminhos relativos
  // (./assets/index.js em vez de /assets/index.js).
  // Isso é obrigatório para Electron: loadFile() usa file://, onde
  // paths absolutos como /assets/ resolvem para a raiz do drive (C:\assets\),
  // não para a pasta dist/. Com "./" o browser resolve corretamente
  // relativo ao index.html, independente de onde o app está instalado.
  base: "./",

  server: {
    port: 5173,
    strictPort: true
  },

  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Desativa aviso de chunk grande do Monaco (esperado, Monaco é ~1.5MB)
    chunkSizeWarningLimit: 2048
  }
});
