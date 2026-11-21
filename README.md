# Sahabat Nalar PAI

Platform pembelajaran Pendidikan Agama Islam dan Budi Pekerti (PAI-BP) Fase E Kelas X SMAN 1 Pangkalan Kerinci bersama asisten belajar **AIsyah**.

## Cara Menjalankan Lokal
1. Pasang dependensi:
   ```bash
   npm install
   ```
2. Salin `.env.local.example` menjadi `.env.local` lalu isi `GEMINI_API_KEY`.
3. (Opsional) Unduh backsound Kahoot & SFX Myinstants ke `public/sounds/`:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\download-sounds.ps1
   ```
4. Jalankan server lokal (terbuka untuk perangkat lain di Wi-Fi yang sama):
   ```bash
   npx next dev -H 0.0.0.0
   ```
