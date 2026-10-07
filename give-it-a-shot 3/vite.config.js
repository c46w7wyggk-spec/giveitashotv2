import { defineConfig } from 'vite';

// Every build gets a unique id. It is baked into the app and also written to /version.json,
// so an installed copy can notice a newer deploy and offer to update.
const BUILD = String(Date.now());

export default defineConfig({
  build: { target: 'es2020' },
  define: { __BUILD__: JSON.stringify(BUILD) },
  plugins: [{
    name: 'version-json',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD }) });
    },
  }],
});
