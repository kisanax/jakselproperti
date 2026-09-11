# jakselproperti.com — Internal Admin & Property Portal

Portal internal dan publik khusus listing penjualan properti di wilayah Jakarta Selatan, mengacu pada **Blueprint v0.3**.

---

## 📚 Dokumentasi Lengkap
Dokumentasi teknis menyeluruh, arsitektur data, riwayat fitur yang sudah selesai, serta panduan pengujian dapat dilihat pada:
👉 **[docs/PROGRESS.md](../docs/PROGRESS.md)**
👉 **[docs/Blueprint.MD](../docs/Blueprint.MD)**

---

## 🚀 Memulai (Local Development)

### 1. Prasyarat
- Node.js 20+
- MySQL (Laragon / MySQL Server lokal berjalan pada port 3306)

### 2. Konfigurasi Environment (`.env`)
Pastikan variabel basis data mengarah ke database lokal Anda:
```env
DATABASE_URL="mysql://root:@localhost:3306/jakselproperti"
```

### 3. Setup Basis Data
```bash
# Sinkronisasi schema Prisma ke MySQL
npx prisma db push

# Generate Prisma Client
npx prisma generate

# Isi data awal (Kecamatan Jakarta Selatan & Seed Demo)
npx tsx prisma/seed.ts
```

### 4. Menjalankan Server Development
```bash
npm run dev
```

Buka di browser:
- **Admin Panel:** [http://localhost:3000/admin](http://localhost:3000/admin)
- **Portal Publik:** [http://localhost:3000](http://localhost:3000)

---

## 🛠️ Fitur Utama yang Tersedia
- **Manajemen Properti & Listing:** Transisi 10 status workflow listing, tracking riwayat harga & status, edit properti, dan safe delete terproteksi kode.
- **Bulk / Batch Import CSV:** Import massal properti dengan auto-generate kode `JS-xxxx`, validasi baris pra-import, dan pencocokan kecamatan/kawasan otomatis.
- **Pihak Terkait (Owner & Perantara):** Full CRUD owner & broker, 4-tier badge kepercayaan (*Trust Level*), serta proteksi integritas data.
- **CRM Leads (Kanban):** Pipeline 6-stage kanban dengan native HTML5 Drag & Drop, optimistic updates, dan audit logging aktivitas.
- **Database Customer:** Deduplikasi calon pembeli via nomor telepon, pencarian terintegrasi, dan riwayat minat properti.
- **Area 2-Layer:** 10 Kecamatan administratif Jakarta Selatan + Kawasan populer (*Kawasan*) dengan fitur banner beranda.

