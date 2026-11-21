# Panduan Publish Sahabat Nalar PAI ke Vercel + Login Google Resmi

## 1. Buat Google OAuth Client ID (Gratis, 2 Menit)
1. Buka **Google Cloud Console** (`https://console.cloud.google.com/apis/credentials`).
2. Buat project baru (misal: `Sahabat Nalar PAI`) lalu buka **APIs & Services → OAuth consent screen** → pilih **External** → isi nama aplikasi dan email Anda → Simpan.
3. Buka **Credentials → + Create Credentials → OAuth client ID** → pilih **Web application**.
4. Pada **Authorized JavaScript origins**, tambahkan:
   - `http://localhost:3000`
   - `https://<nama-proyek-anda>.vercel.app` (setelah deploy ke Vercel)
5. Klik **Create** lalu salin **Client ID** (`xxxx.apps.googleusercontent.com`).

## 2. Publish ke Vercel (Gratis, 1 Menit)
1. Upload folder `sahabat-nalar-pai` ke repositori GitHub Anda (pastikan `.env.local` tidak ikut terupload).
2. Buka **Vercel** (`https://vercel.com/new`) → klik **Import** pada repositori tersebut.
3. Pada bagian **Environment Variables**, tambahkan:
   - `GEMINI_API_KEY` = API Key Gemini Anda
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` = Client ID Google dari langkah 1
   - `NEXT_PUBLIC_ALLOW_ANY_GOOGLE_DOMAIN` = `false` (hanya `@guru.sma.belajar.id` & `@sma.belajar.id`)
4. Klik **Deploy**. Setelah domain `.vercel.app` aktif, pastikan domain tersebut sudah ditambahkan di **Authorized JavaScript origins** pada langkah 1.
