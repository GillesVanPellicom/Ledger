import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import javascriptObfuscator from "vite-plugin-javascript-obfuscator";

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    react(),

    // Only obfuscate in production builds
    // mode === "production" &&
    //   javascriptObfuscator({
    //     compact: true,
    //     controlFlowFlattening: true,
    //     controlFlowFlatteningThreshold: 0.75,
    //     deadCodeInjection: true,
    //     deadCodeInjectionThreshold: 0.4,
    //     stringArray: true,
    //     stringArrayEncoding: ["base64"],
    //     stringArrayThreshold: 0.75,
    //     renameGlobals: false, // IMPORTANT for React + Electron
    //     sourceMap: false
    //   })
  ].filter(Boolean),

  build: {
    sourcemap: false
  }
}));