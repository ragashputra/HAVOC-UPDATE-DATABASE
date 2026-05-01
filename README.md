> CARA CEK ERROR APP YANG SUDAH TERINSTALL
1. Buka Powershell Administrator di Laptop
2. Colok USB HP Android via USB Debugging
3. adb devices di Powershell
4. Jalan Powershell : adb logcat *:E 2>&1 | Select-String -Pattern "FATAL|crash|audioarchiver|AndroidRuntime"
5. Buka HP sambal powershell jalankan perinta tadi
6. Copy Hasilnya ke Claude.ai

> SEBELUM BUILD APK PASTIKAN EXPONENT IMAGE PICKIER DLL
1. cd frontend file nya
2. jalankan powershell : npx expo install expo-image-picker
3. build ulang APK : eas build --platform android --profile preview

> LINK PWA UNTUK SAFARI IPHONE
https://ragashputra.github.io/Ragash1993/pwa/

> CARA INSTALL EXPO GO VIA POWERSHELL (PERCOBAAN SEBELUM BUILD APK)
1. cd C:\Ragash1993-base\frontend (Sesuai lokasi folder)
2. npm install
3. npx expo start  (Ops : eas logout/ eas login = Untuk login/logout akun expo via powershell)
4. Scan QR yang dihasilkan

> RESOLVE ERROR YANG SERING TERJADI :
1. pastikan file .env ada di frontend dengan isi = EXPO_PUBLIC_BACKEND_URL=https://ragash1993-production.up.railway.app
2. pastikan file eas.json di frontend terisi URL Backend di server railway (server deploy) = "EXPO_PUBLIC_BACKEND_URL": "https://ragash1993-production.up.railway.app"
3. jika Expo tidak connect server pastikan file auth.tsx ubah isinya dari = const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL!; jadi = const BACKEND_URL = "https://ragash1993-production.up.railway.app"; (untuk memastikan .env ada error atau tidak) lalu dikembalikan lagi jika berhasil

> JIKA INGIN CODING DI BASE44, PASTIKAN DOWNLOAD PREVIEW BUKAN HTML TAPI REACT NATIVE CODE KARENA UNTUK EXPO GO
