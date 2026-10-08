import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The backend is a separate project in ../server, running on port 3000 in development.
// API_TARGET can point the dev proxy at another address (used by automated browser checks
// that run their own server on a different port).
const apiTarget = process.env.API_TARGET || 'http://localhost:3000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // In development the browser talks only to Vite; API and socket calls are passed on to Express.
    proxy: {
      '/api': apiTarget,
      '/socket.io': { target: apiTarget, ws: true },
    },
  },
});
