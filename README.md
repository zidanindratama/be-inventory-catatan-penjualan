# Inventory Catatan Penjualan — README

> Aplikasi **Inventory & Catatan Penjualan** berbasis **NestJS + Prisma (MongoDB)** dengan **JWT Auth**, role-based authorization, validasi **Zod**, dan modul **Finance** (ringkasan, arus kas, tren, gross profit, dsb).
> Response API seragam (`{ success: boolean, data|error }`) dan error tertangani lewat `HttpExceptionFilter`.

---

## ✨ Fitur Utama

- **Auth (JWT Access + Refresh)**
  - Registrasi & login
  - Refresh token
  - Guard `jwt` & `jwt-refresh`
  - Role-based: `ADMIN`, `USER`

- **Manajemen User**
  - Me (`/users/me`)
  - List, detail, update, hapus (ADMIN)

- **Manajemen Item**
  - List + pencarian + pagination
  - Detail, create/update/delete (create/update/delete hanya `ADMIN`)

- **Transaksi Stok & Penjualan**
  - `SALE`, `STOCK_IN`, `REJECT`, `ADJUST`
  - Validasi `ObjectId` untuk `itemId`
  - Update stok otomatis + guard stok negatif
  - Payment khusus `SALE` (CASH/TRANSFER)
  - Auto buat **Finance entry**

- **Keuangan (Finance)**
  - **Summary**: omset, pengeluaran, saldo akhir, modal stok
  - **Cashflow** per tipe transaksi
  - **Trend** per hari/minggu/bulan (income, expense, net, balance)
  - **Gross Profit** (income, COGS, margin%)
  - **Payment Breakdown** (CASH/TRANSFER/UNPAID)
  - **Statement** dengan pagination & filter tanggal/q

- **Validasi & Error Handling**
  - `ZodValidationPipe` untuk DTO berbasis Zod
  - `HttpExceptionFilter` (Zod, Prisma Known Errors)
  - `ResponseInterceptor` bungkus `{ success: true, data }`

---

## 🧱 Teknologi

- **Backend**: NestJS 10
- **Auth**: `@nestjs/jwt` (JWT access & refresh)
- **ORM**: Prisma (MongoDB)
- **DB**: MongoDB Atlas / self-hosted
- **Validation**: Zod (`@anatine/zod-nestjs` untuk DTO)
- **Security**: Helmet, CORS, Cookie Parser
- **Image (opsional)**: Cloudinary (env sudah disiapkan)

---

## 📁 Struktur Skema (Prisma)

- **User**: `email`, `name`, `passwordHash`, `role`, `refreshToken?`
- **Item**: `name`, `costPrice`, `sellPrice`, `stock`, `imageUrl?`
- **Transaction**: `type` (`SALE|STOCK_IN|REJECT|ADJUST`), `date`, `note?`, `items[]`, `payment?`, `financeEntry?`, `createdBy?`
- **TransactionItem**: `itemId`, `qty`, `unitCost`, `unitPrice?`, `subtotalCost`, `subtotalSell?`
- **Payment**: `method` (`CASH|TRANSFER`), `amount`, `transferRef?` (hanya untuk `SALE`)
- **Finance**: `description`, `income`, `expense`, `balanceAfter`, relasi `transaction?`

> Semua ID menggunakan **Mongo ObjectId**.

---

## 🔧 Menjalankan Secara Lokal

### 1) Persiapan

- Node.js 18+
- MongoDB (mis. MongoDB Atlas URL)

### 2) Clone & Install

```bash
git clone <repo-url>
cd inventory-catatan-penjualan
npm install
```

### 3) Konfigurasi Environment

Buat file `.env` (salin dari contoh di bawah):

```env
PORT=5000
NODE_ENV=development

DATABASE_URL=mongodb+srv://<db_user>:<db_password>@cluster0.4nfnpcg.mongodb.net/?appName=Cluster0

JWT_ACCESS_SECRET=supersecretaccess
JWT_REFRESH_SECRET=supersecretrefresh
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
```

### 4) Prisma (MongoDB)

```bash
npx prisma generate
npx prisma db push
```

> **MongoDB** tidak memakai migrate SQL; gunakan `db push`.

### 5) Run App

```bash
npm run start:dev
# default http://localhost:5000
```

Health check:

```
GET /
{
  "status": "ok",
  "message": "Inventory API is running",
  "timestamp": "...",
  "env": "development",
  "port": 5000
}
```

---

## 🔐 Autentikasi & Autorisasi

- **Access Token**: dipakai untuk akses endpoint (header `Authorization: Bearer <token>`). Masa berlaku default `15m`.
- **Refresh Token**: untuk minta token baru di `/auth/refresh`. Masa berlaku default `7d`.
- **Role**:
  - `@Auth()` → user terautentikasi
  - `@Auth(Role.ADMIN)` → hanya admin

---

## 🧪 Format Response & Error

### Response Sukses

Semua response sukses dibungkus `ResponseInterceptor`:

```json
{ "success": true, "data": { ... } }
```

### Response Error

Diformat oleh `HttpExceptionFilter`:

```json
{
  "success": false,
  "path": "/endpoint",
  "error": {
    "message": "Validation failed",
    "issues": [{ "path": "lines.0.qty", "message": "...", "code": "custom" }],
    "name": "ZodError" // (non-prod disertakan name)
  }
}
```

**Prisma Known Errors**:

- `P2002` → Unique constraint violated
- `P2003` → Foreign key constraint failed

---

## 🛣️ Daftar Endpoint (Ringkas)

> Prefix default: tanpa `/api` (langsung dari Controller). Sertakan header `Authorization` untuk endpoint ber-proteksi.

### Auth

- `POST /auth/register`
  - body: `{ email, name, password }`
  - return: `{ accessToken, refreshToken }`

- `POST /auth/login`
  - body: `{ email, password }`
  - return: `{ accessToken, refreshToken }`

- `POST /auth/refresh` (Guard: `jwt-refresh`)
  - header: `Authorization: Bearer <refreshToken>`
  - return: `{ accessToken, refreshToken }`

**Contoh:**

```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mail.com","name":"Admin","password":"secret123"}'
```

---

### Users

- `GET /users/me` — **Auth**
- `GET /users?q=&page=&limit=&role=` — **ADMIN**
- `GET /users/:id` — **ADMIN**
- `PATCH /users/:id` — **ADMIN**
  - body (opsional): `{ name?, email?, role? }`

- `DELETE /users/:id` — **ADMIN**

---

### Items

- `GET /items?q=&page=&limit=` — **Auth**
- `GET /items/:id` — **Auth**
- `POST /items` — **ADMIN**
  - body: `{ name, costPrice, sellPrice, stock?, imageUrl? }`

- `PATCH /items/:id` — **ADMIN**
  - body: salah satu dari field di atas (wajib minimal 1 field)

- `DELETE /items/:id` — **ADMIN**

**Catatan Validasi:**

- `imageUrl` boleh kosong/`null` (dipreprocess jadi `undefined`)
- numeric pakai `z.coerce.number().int().nonnegative()`

---

### Transactions

- `GET /transactions` — **ADMIN**
- `POST /transactions` — **ADMIN**
  - body:

    ```json
    {
      "type": "SALE|STOCK_IN|REJECT|ADJUST",
      "date": "2025-10-24T00:00:00.000Z",
      "note": "string?",
      "lines": [
        {
          "itemId": "<24-hex ObjectId>",
          "qty": 10,
          "unitCost": 2400, // opsional (default ke item.costPrice)
          "unitPrice": 3000 // opsional; hanya dipakai untuk SALE (default ke item.sellPrice)
        }
      ],
      "payment": {
        "method": "CASH|TRANSFER",
        "amount": 30000,
        "transferRef": "ABC123" // opsional
      }
    }
    ```

  - **Aturan penting:**
    - `payment` hanya diizinkan untuk `type = SALE`
    - `qty`:
      - `ADJUST`: boleh negatif/positif tapi **tidak boleh 0**
      - `SALE|STOCK_IN|REJECT`: **harus > 0**

    - Stok tidak boleh minus (akan error)

**Efek Samping Otomatis:**

- Update stok item
- `TransactionItem` dibuat untuk tiap `line`
- Jika `SALE` & `payment` terisi → buat `Payment`
- Buat satu entry di **Finance**:
  - `SALE` → income = total `subtotalSell`
  - `STOCK_IN` → expense = total `subtotalCost`
  - `REJECT` → expense = 0 (non-omzet, _tidak_ mengubah cashflow keluar)\*
  - `ADJUST` → expense = 0 (penyesuaian stok non-cash)\*
  - **balanceAfter** = (saldo sebelumnya) + income − expense

- _Catatan_: Logika current code menganggap `REJECT/ADJUST` tidak menggeser cash (expense=0). Sesuaikan kebutuhan bisnis bila diperlukan.

---

### Finance

Semua **Auth**.

- `GET /finance/summary?from=&to=`
  - `{ omset, pengeluaran, sisaUang, saldoAkhir, modalStok }`

- `GET /finance/cashflow?from=&to=`
  - Per tipe transaksi: `{ type, income, expense, net }[]`

- `GET /finance/trend?groupBy=day|week|month&from=&to=`
  - `{ period, income, expense, net, balance }[]`

- `GET /finance/gross-profit?from=&to=`
  - `{ income, cogs, grossProfit, marginPct }`

- `GET /finance/payment-breakdown?from=&to=`
  - `{ CASH: {amount,count}, TRANSFER: {amount,count}, UNPAID: {amount,count} }`

- `GET /finance/statement?q=&page=&limit=&from=&to=`
  - Pagination + filter: `{ page, limit, total, data: [{ id, date, description, income, expense, balanceAfter }] }`

**Filter Tanggal**

- `from` & `to` (ISO string) diterjemahkan jadi filter `createdAt` (kecuali beberapa endpoint yang pakai `transaction.date`).

---

## 🧩 Validasi & DTO (Zod)

- **DTO** dibuat dari skema Zod via `createZodDto` (`@anatine/zod-nestjs`)
- Global pipe: `ZodValidationPipe` (mendukung JSON string body)
- **ObjectId** validasi:

  ```ts
  const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');
  ```

---

## 🛡️ Middleware/Global

- `app.use(helmet())`
- `app.enableCors()`
- `app.use(cookieParser())`
- `app.useGlobalInterceptors(new ResponseInterceptor())`
- `app.useGlobalFilters(new HttpExceptionFilter())`
- `app.useGlobalPipes(new ZodValidationPipe())`

---

## 🔑 Contoh Alur Cepat (cURL)

1. **Register & Login**

```bash
ACCESS=$(curl -s -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mail.com","password":"secret123"}' | jq -r .data.accessToken)
```

2. **Create Item (ADMIN)**

```bash
curl -X POST http://localhost:5000/items \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d '{"name":"Gula 1kg","costPrice":12000,"sellPrice":15000,"stock":100}'
```

3. **Buat Transaksi SALE (ADMIN)**

```bash
curl -X POST http://localhost:5000/transactions \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d '{
    "type":"SALE",
    "lines":[{"itemId":"<ITEM_ID>","qty":2}],
    "payment":{"method":"CASH","amount":30000}
  }'
```

4. **Cek Finance Summary**

```bash
curl -H "Authorization: Bearer $ACCESS" \
  http://localhost:5000/finance/summary
```

---

## 🧭 Catatan Implementasi

- **Balance** di `Finance` dihitung dari **entri terakhir**: `(last.balanceAfter ?? 0) + income - expense`.
- **Modal Stok** dihitung dari `sum(item.stock * item.costPrice)`.
- **Trend bucket**:
  - `day`: `YYYY-MM-DD`
  - `week`: `W:<monday-iso-date>`
  - `month`: `YYYY-MM`

- **Statement** menggunakan `createdAt` (Finance), bukan `transaction.date`.

---

## 🙌 Kontribusi

- Buka issue/PR dengan deskripsi jelas.
- Sertakan langkah reproduce untuk bug.
- Ikuti pola response & error agar konsisten.

---

## 👤 Penulis

**Muhamad Zidan Indratama** — Full-Stack Developer
Portfolio: [https://zidanindratama.vercel.app](https://zidanindratama.vercel.app)
Stack: TypeScript, NestJS, Prisma, MongoDB, React/Next.js, Tailwind, dsb.
