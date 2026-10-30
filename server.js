/**
 * Entry point untuk hosting (Hostinger, dsb).
 *
 * Hostinger mendeteksi project ini sebagai aplikasi Express dan menjalankan
 * `node server.js`. Tugas file ini hanya satu: menyajikan hasil build Vite
 * (folder `dist/`) sebagai aplikasi static SPA.
 *
 * lokal: `npm run build && npm start`
 */
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, 'dist');
const PORT = process.env.PORT || 3000;

const app = express();

// Sajikan file hasil build (js, css, gambar, video, dll).
app.use(express.static(DIST_DIR, { index: false, maxAge: '1h' }));

// Fallback: semua route yang tidak cocok -> index.html (SPA routing).
app.use((req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'), (err) => {
    if (err) {
      res
        .status(503)
        .type('text/plain')
        .send('Build belum tersedia. Jalankan: npm run build');
    }
  });
});

app.listen(PORT, () => {
  console.log(`PrelimHub berjalan di http://localhost:${PORT}`);
});
