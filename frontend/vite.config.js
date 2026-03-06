import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      /* suas configs de PWA */
    }),
  ],
  server: {
    host: true,
    port: 5000,
    watch: {
      usePolling: true, // Essencial para Windows + Docker detetar mudanças
    },
    hmr: {
      clientPort: 5000, // Garante que o navegador consiga se conectar para atualizar
    },
  },
});
