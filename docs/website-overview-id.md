# Indosourcing - Penjelasan Website dan Fitur

Dokumen ini menjelaskan gambaran umum website `lsci-hub-web` serta fitur-fitur utamanya berdasarkan implementasi yang ada saat ini.

## Gambaran Umum

Indosourcing adalah platform marketplace B2B untuk mempertemukan pembeli dan pemasok dalam proses sourcing. Fokus utama website ini adalah:

- mempublikasikan kebutuhan pembeli (RFQ / demand listing),
- menampilkan ketersediaan pemasok (supply listing),
- memfasilitasi proses penawaran sampai keputusan deal,
- menyediakan ruang kerja terpisah sesuai peran pengguna.

## Target Pengguna

Website melayani tiga kelompok pengguna:

- **Buyer (pembeli)**: membuat permintaan, menilai penawaran pemasok, kirim offer request, dan bernegosiasi.
- **Supplier (pemasok)**: melihat RFQ terbuka, mengajukan penawaran, menindaklanjuti offer request dari buyer.
- **Platform Superadmin**: mengelola akses lintas peran, organisasi, serta pengaturan operasional platform.

## Fitur Utama

### 1) Autentikasi dan Otorisasi (RBAC)

- Login dan manajemen sesi berbasis Supabase Auth.
- Pendaftaran publik untuk akun buyer/supplier.
- Guarding route server-side (`requireSession`, guard role) agar akses halaman sesuai role.
- Model RBAC berbasis:
  - profil pengguna (`profiles`) untuk peran user,
  - organisasi (`organizations`) untuk konteks tenant B2B,
  - kebijakan RLS di database untuk keamanan data.

### 2) Workspace Marketplace Berdasarkan Peran

- Entry point `/marketplace` mengarahkan user ke workspace yang relevan:
  - `/buyer/marketplace` untuk buyer,
  - `/supplier/marketplace` untuk supplier,
  - user multi-role/superadmin dapat memilih workspace.

### 3) Fitur Buyer

- **Kelola RFQ / Demand Listing**
  - buat permintaan baru,
  - lihat status permintaan (aktif/tertutup),
  - lihat ringkasan penawaran yang diterima.
- **Review Penawaran Supplier**
  - daftar penawaran dengan tab status: menunggu, diterima, ditolak,
  - konteks harga, kuantitas, lead time, profil pemasok.
- **Offer Request Workflow**
  - pilih RFQ aktif,
  - browse pemasok yang relevan,
  - kirim offer request ke supplier terpilih.
- **Trade Chat (Offer Context)**
  - chat antara buyer dan supplier untuk konteks transaksi tertentu.

### 4) Fitur Supplier

- **Lihat RFQ Terbuka**
  - daftar RFQ aktif yang sedang menerima quote,
  - ringkasan kebutuhan buyer, tenggat, lokasi, dan konteks nilai deal.
- **Ajukan dan Pantau Penawaran**
  - kirim response untuk RFQ,
  - pantau status quote (pending/accepted/rejected),
  - lihat metrik hasil penawaran.
- **Tindak Lanjut Offer Request**
  - daftar request dari buyer,
  - aksi terima/tolak sesuai status request.
- **Kelola Supply Listing**
  - publikasi stok/kapasitas,
  - informasi quantity, harga estimasi, MOQ, lead time, lokasi, dan status listing.

### 5) Akun Organisasi Marketplace

- Halaman akun organisasi untuk mengelola identitas brand marketplace:
  - nama, deskripsi, brand story, logo, negara operasional.
- Menampilkan status peran akun (buyer/supplier) serta credit score.
- Hak edit dibatasi sesuai role (admin/manager/superadmin).

### 6) Penasihat AI Marketplace

- Halaman "Penasihat AI" untuk membantu:
  - panduan sourcing,
  - rekomendasi shortlist,
  - persiapan negosiasi.
- Akses dibatasi untuk role yang berwenang (buyer/supplier/superadmin).

### 7) Monitoring Status dan UX Operasional

- Ringkasan metrik pada header marketplace (jumlah RFQ, penawaran, status deal).
- Tampilan list lanjutan dengan filter, badge status, dan aksi cepat.
- Alur dipisah dari dashboard admin agar pengalaman user marketplace lebih fokus.

## Alur Penggunaan Singkat

### Alur Buyer
1. Login -> masuk ke marketplace buyer.
2. Buat RFQ (demand listing) atau pilih RFQ aktif.
3. Terima penawaran dari supplier.
4. Review dan putuskan (accept/reject) atau kirim offer request.
5. Lanjut negosiasi melalui chat transaksi.

### Alur Supplier
1. Login -> masuk ke marketplace supplier.
2. Pantau RFQ terbuka.
3. Kirim quote/penawaran ke buyer.
4. Terima feedback status (diterima/ditolak).
5. Tanggapi offer request dan lanjutkan komunikasi transaksi.

## Teknologi Inti

- **Framework**: Next.js (App Router) + TypeScript.
- **UI**: Tailwind CSS + komponen UI internal.
- **Backend/Data**: Supabase (Auth, Postgres, RLS, API).
- **Arsitektur akses**: server guard + database policy (defense in depth).

## Catatan

Dokumen ini adalah ringkasan produk untuk memahami struktur website dan kapabilitas utama. Jika dibutuhkan, dokumen dapat dilanjutkan ke versi:

- untuk pengguna bisnis (non-teknis),
- untuk onboarding tim engineering,
- atau versi sales/demo deck yang lebih ringkas.
