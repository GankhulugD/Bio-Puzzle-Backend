# Render дээр Bio Puzzle Backend суулгах

Энэ төсөл **Node.js + Express + Prisma (PostgreSQL)** тул Render дээр **Web Service** + **PostgreSQL** ашиглана.

## Юу хийгдсэн бэ

- **`tsconfig.build.json`**: `tsc` одоо `dist/` руу бодитоор compile хийнэ (өмнө `noEmit: true` байсан тул build амжилттай харагдаж байгаад `dist` үүсэхгүй байсан).
- **`package.json`**: `build` болон `render:build` энэ config-оор ажиллана.
- **`render.yaml`**: Blueprint ашиглавал Postgres + Web Service нэг дор үүсгэнэ (бүс: `singapore` — хүсвэл өөрчилж болно).

## Арга 1: Blueprint (render.yaml) — хурдан

1. Кодыг **GitHub / GitLab** руу push хийнэ.
2. [Render Dashboard](https://dashboard.render.com) → **Blueprints** → **New Blueprint Instance**.
3. Repo сонгоод `render.yaml`-ыг уншуулна.
4. **CORS_ORIGIN**-ыг гараар оруулна: frontend-ийн URL (жишээ нь `https://...vercel.app`). Олон домэйн бол таслалаар: `https://a.com,https://b.com`.
5. **Deploy** хүлээнэ. Эхний удаа `npm run render:start` дотор **`prisma migrate deploy`** ажиллаж схем бэлэн болно.

## Бүх орчны хувьсагч (Render / local ижил түлхүүр)

Дэлгэрэнгүй жишээ: репо дахь **`.env.example`** файлыг хуулж `.env` болгоод солино. Доорх хүснэгтэд үүрэг тодорхойлогдсон.

| Түлхүүр | Заавал эсэх | Жишээ / тайлбар |
|--------|-------------|-------------------|
| `DATABASE_URL` | **Тийм** | `postgresql://...?sslmode=require` — Postgres connection string |
| `JWT_SECRET` | **Тийм** (auth ашиглавал) | Дор хаяж 16 тэмдэгт; production-д санамсаргүй урт string |
| `JWT_EXPIRES_IN` | Үгүй | Default код дээр `7d`. Жишээ: `24h`, `3600` |
| `CORS_ORIGIN` | Үгүй | Default `http://localhost:3000`. Олон үүрийг `,`-ээр тусгаарлана |
| `PORT` | Үгүй (Render) | Local: `4000`. **Render дээр битгий нэм** — платформ өөрөө өгнө |
| `NODE_ENV` | Зөвлөмж | Production: `production` |
| `PRISMA_PG_ADAPTER` | Үгүй | Зөвхөн утга нь яг `true` үед `@prisma/adapter-pg` + Pool. Ихэвчлэн тохируулах шаардлагагүй |

**Render дээр нэг дор оруулах Environment жагсаалт (гараар үүсгэх үед):**

```text
DATABASE_URL=<Postgres сервисээс хуулсан Internal эсвэл External URL>
JWT_SECRET=<32+ тэмдэгтийн санамсаргүй string>
JWT_EXPIRES_IN=7d
NODE_ENV=production
CORS_ORIGIN=https://таны-frontend.domain
```

`PORT`-ыг **бүү нэм**. Blueprint (`render.yaml`) ашиглавал `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `NODE_ENV` ихэвчлэн автоматаар/өмнө нь тохируулагдсан; зөвхөн `CORS_ORIGIN`-ыг гараар бөглөнө.

## Арга 2: Гараар Web Service + Postgres

### 1) PostgreSQL

1. Dashboard → **New** → **PostgreSQL**.
2. Төлөвлөгөө, бүсээ сонгоно.
3. Database үүссэний дараа **Internal Database URL** эсвэл **External** (холболтоос хамаарна) хуулна — энэ нь `DATABASE_URL` болно.

### 2) Web Service

1. **New** → **Web Service** → repo холбоно.
2. Тохиргоо:
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run render:start`
3. **Environment** — дэлгэрэнгүйг дээрх **«Бүх орчны хувьсагч»** хүснэгтээс харна.

### 3) Шалгах

- Browser эсвэл curl: `https://<таны-сервис>.onrender.com/health` → `{"status":"ok",...}` ирвэл OK.

## Анхаарах зүйлс

- **Холодон эхлэлт**: Free Web Service хэсэг хугацааны дараа унтдаг; эхний request удаан байж болно.
- **Миграци**: `render:start` нь `prisma migrate deploy` ажиллуулдаг — шинэ migration push хийсний дараа redeploy хийхэд schema шинэчлэгдэнэ.
- **Seed**: Анхны өгөгдөл хэрэгтэй бол production дээр нэг удаа (Render **Shell** эсвэл нэг удаагийн **Job**): `npx prisma db seed` — төслийн seed тохиргоотой эсэхийг шалгана.

## Алдаа гарвал

- Build унавал: log дээр `dist/index.js` олдох эсэхийг шалгана (одоо `npm run build` зөв `dist` үүсгэнэ).
- DB холболт: connection string-д `?sslmode=require` байх нь ихэнх тохиолдолд зөв.
- CORS: browser console дээр CORS алдаа гарвал `CORS_ORIGIN`-д яг frontend-ийн протокол + домэйн (порттой) оруулсан эсэхээ шалгана.
