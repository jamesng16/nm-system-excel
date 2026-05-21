# NM System - Excel Uploader & Processor

He thong tai len va xu ly tep tin Excel lon tich hop co che stream parser bat dong bo tren Edge Function va quan ly du lieu thoi gian thuc tren Supabase Cloud & React Frontend.

Du an duoc thiet ke chat che theo mo hinh Clean Architecture cap do Module, dong thoi ap dung phan quyen Row-Level Security (RLS) nghiem ngat cho Admin va Guest.

---

## 1. Cac Tinh Nang Noi Bat

* **Xu ly tep tin Excel lon dang tin cay**: Ho tro tai len va phan tich cac file Excel nang (da kiem thu thanh cong voi file 80MB, hon 400 dong va gan 50 hinh anh) ma khong lam treo trinh duyet hay tran bo nho.
* **Stream Parser bat dong bo tren Edge (Deno)**: Su dung Edge Function phan tich luong du lieu Excel thoi gian thuc, trinh xuat song song ca du lieu van ban va cac hinh anh nhung (embedded images), luu luong RAM duoi 150MB tren Cloud Free Tier.
* **Grid du lieu hieu nang cao**: Ho tro phan trang (Pagination) va tim kiem phia server (Server-side Search) tren o nho JSONB bang PostgreSQL RPC, cho phep tim kiem toan cuc hoac tim kiem loc theo cot thoi gian thuc.
* **Quan ly va trinh chieu anh nhung**: Cac buc anh duoc trich xuat tu file Excel tu dong luu tru tren Storage bucket public cua Supabase, tich hop lightbox xem thu anh phong to sac net tren frontend.
* **Phan quyen nguoi dung nghiem ngat (RLS)**: 
  * **Admin**: Xem, upload, chinh sua tung dong thong qua form dong, xoa dong du lieu va xoa file (kem don dep vat ly tren Storage).
  * **Guest**: Chi co quyen doc (Read-only), an toan bo cac nut thao tac ghi/sua/xoa tren toan bo giao dien.
* **Nhat ky logs thoi gian thuc**: Drawer trượt chuyen nghiep hien thi chi tiet logs qua trinh chay parser thoi gian thuc (Info, Warning, Error) thong qua Supabase Realtime Postgres Changes.

---

## 2. Cong Nghe Su Dung

* **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide React (Icons).
* **Backend & Database**: Supabase CLI, PostgreSQL, Supabase Auth, Supabase Storage, Deno Edge Functions.
* **Moi truong chay thuc te**: Vercel (Frontend Hosting) & Supabase Cloud (Database & Serverless Edge Functions).
* **Moi truong phat trien**: Docker & Docker Compose (cho Supabase local).

---

## 3. Kien Truc Du An (Clean Architecture)

Ma nguon frontend duoc to chuc theo Clean Architecture de co lap hoan toan nghiep vu loi khoi cac thu vien va framework ben ngoai:

```text
src/modules/excel-processor/
├── domain/                      # Lop Core Logic & Entity (Khong phụ thuộc)
│   ├── entities/                # ExcelFile, ExcelRow, ExcelRowImage, ProcessingLog
│   └── repositories/            # IExcelRepository (Interface dinh nghia hop dong)
├── usecases/                    # Chua cac ca su dung rieng biet (Pure Logic)
│   ├── UploadExcelFile.ts
│   ├── GetIngestedRowsPaginated.ts
│   ├── UpdateRowContent.ts
│   ├── DeleteRow.ts
│   └── GetProcessingLogs.ts
├── adapters/                    # Implementation ket noi den ha tang ben ngoai
│   └── SupabaseExcelRepository.ts # Repository truc tiep ket noi Supabase Client
└── presentation/                # Giao dien nguoi dung (React Components & Hook)
    ├── hooks/                   # useExcelProcessor (State & Action Management)
    └── views/                   # DashboardView (Component giao dien)
```

---

## 4. Huong Dan Cai Dat Cuc Bo (Local Setup)

### Yeu cau he thong
* Node.js v18 tro len
* Docker & Docker Compose (de khoi chay Supabase cuc bo)

### Cac buoc thiet lap

1. **Clone repository va cai dat thu vien**:
   ```bash
   npm install
   ```

2. **Khoi dong Docker va Supabase Local**:
   ```bash
   npx supabase start
   ```

3. **Chay database migrations thuc thi database local**:
   ```bash
   npx supabase migration up
   ```

4. **Cau hinh file moi truong (.env)**:
   Tao file `.env` o thu muc goc va copy thong tin phan Authentication Keys sau khi lenh `supabase start` chay thanh cong:
   ```env
   VITE_SUPABASE_URL=http://localhost:54321
   VITE_SUPABASE_ANON_KEY=your-local-anon-key-here
   ```

5. **Khoi dong ung dung phat trien**:
   ```bash
   npm run dev
   ```
   *Truy cap ung dung tai duong dan mặc định: http://localhost:3000/ (hoac port lan can duoc cap phat)*

---

## 5. Kich Ban Tai Khoan Kiem Thu (Testing Accounts)

He thong da duoc migration san hai tai khoan demo co quyen RLS khac nhau:

| Vai Tro | Email | Mat Khau | Quyen RLS va Giao Dien |
|---|---|---|---|
| **Admin** | `admin@hcs.com` | `admin123` | Toan quyen: Upload Excel, Chinh sua (Edit Row Modal), Xoa dong, Xoa file, Xem log |
| **Guest** | `guest@hcs.com` | `guest123` | Read-only: Chi xem du lieu, khong co cac nut upload/chinh sua/xoa. |

---

## 6. Huong Dan Trien Khai Len Production

Du an hien tai da duoc dong bo hoan hao len Supabase Cloud va Vercel. De trien khai cac thay doi tiep theo:

### 6.1. Trien khai Database & Edge Functions (Supabase Cloud)

1. **Lien ket project local voi Supabase Cloud**:
   ```bash
   npx supabase link --project-ref your-cloud-project-ref
   ```
2. **Day migrations database schema len Cloud**:
   ```bash
   npx supabase db push
   ```
3. **Deploy Edge Function phan tich Excel**:
   ```bash
   npx supabase functions deploy parse-excel --project-ref your-cloud-project-ref
   ```

### 6.2. Trien khai Frontend (Vercel)

1. Dang nhap Vercel bang GitHub va Import repository cua ban.
2. Cau hinh hai bien moi truong bat buoc (Environment Variables):
   * `VITE_SUPABASE_URL`: Duong dan project Supabase Cloud cua ban.
   * `VITE_SUPABASE_ANON_KEY`: Anon Key cua du an Supabase Cloud.
3. Bam **Deploy** va he thong se tu dong chay live truc tuyen.
