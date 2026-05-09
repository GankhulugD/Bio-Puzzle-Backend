# Bio-Puzzle Backend API

Энэхүү баримт нь `Bio-Puzzle-Backend` сервер ба `Bio-Puzzle-Frontend`
(Next.js) аппын хооронд хэрхэн холбогдох вэ гэдгийг бүрэн тайлбарласан
**frontend хөгжүүлэгчдэд зориулсан лавлах** баримт юм.

> Хувилбар: 1.1 — 2026-05-06
> Stack: Express 5 + Prisma 6 + PostgreSQL (Neon) + JWT (email / нууц үг)

---

## Агуулга

1. [Архитектур ба портууд](#1-архитектур-ба-портууд)
2. [Хурдан эхлэх (хоёуланг асаах)](#2-хурдан-эхлэх-хоёуланг-асаах)
3. [Орчны хувьсагч](#3-орчны-хувьсагч)
4. [Authentication ба CORS](#4-authentication-ба-cors)
5. [Алдааны формат](#5-алдааны-формат)
6. [Endpoint-ууд](#6-endpoint-ууд)
   - [Public](#61-public)
   - [Auth (register / login)](#62-auth-register--login)
   - [Users](#63-users-routes--users)
   - [Levels](#64-levels-routes--levels)
   - [Sessions](#65-sessions-routes--sessions)
   - [Scores](#66-scores-routes--scores)
7. [Endpoint-ийн хүснэгт (товч)](#7-endpoint-ийн-хүснэгт-товч)
8. [Frontend интеграци](#8-frontend-интеграци)
9. [Өгөгдлийн моделүүд (TS типүүд)](#9-өгөгдлийн-моделүүд-ts-типүүд)
10. [Тоглоомын ердийн урсгал](#10-тоглоомын-ердийн-урсгал)
11. [Алдаа засах гарын авлага](#11-алдаа-засах-гарын-авлага)

---

## 1. Архитектур ба портууд

```
┌────────────────────────┐         ┌──────────────────────────┐
│  Bio-Puzzle-Frontend   │  HTTPS  │   Bio-Puzzle-Backend     │
│  Next.js 16  :3000     │ ──────► │   Express 5      :4000   │
│  local JWT (Bearer)    │         │   jsonwebtoken + bcrypt  │
└──────────┬─────────────┘         └────────┬─────────────────┘
           │                                │
           │ Backend JWT (`sub` = User.id)  │ Prisma ORM
           ▼                                ▼
       localStorage                 PostgreSQL (Neon)
```

| Сервис             | URL (dev)                          |
| ------------------ | ---------------------------------- |
| Frontend (Next.js) | `http://localhost:3000`            |
| Backend (Express)  | `http://localhost:4000`            |
| Health check       | `GET http://localhost:4000/health` |

---

## 2. Хурдан эхлэх (хоёуланг асаах)

**1) Backend.** Шинэ PowerShell цонх:

```powershell
cd Bio-Puzzle-Backend
npm install
npx prisma generate
npx prisma migrate dev      # эсвэл `npm run db:migrate`
npm run dev                 # http://localhost:4000
```

**2) Frontend.** Өөр PowerShell цонх:

```powershell
cd Bio-Puzzle-Frontend
npm install
npm run dev                 # http://localhost:3000
```

**3) Шалгах.** Browser-аас `http://localhost:3000`-г нээж `/register`-ээр
өргөө бүртгэл үүсгээд `/login`-оор ороход backend `POST /auth/*`-аас JWT
буцаагаад frontend token-ийг `localStorage`-д хадгална.

> **Анхаар:** DB-д үлдсэн **хуучин Clerk-хэрэглэгчийн мөрөнд** `passwordHash`
> хоосон байж болно — имэйл давхардвал шинэ бүртгэл алдаагаар таслагдана эсвэл
> Prisma Studio-оор хуучин мөрийг устгаж туршина.

---

## 3. Орчны хувьсагч

### Backend — `Bio-Puzzle-Backend/.env`

```env
DATABASE_URL='postgresql://USER:PASSWORD@HOST/DB?sslmode=require'

# Урт санамсаргүй string (доод хэмжээ 16 тэмдэгт)
JWT_SECRET=your_long_random_secret_at_least_16_chars
JWT_EXPIRES_IN=7d

PORT=4000
NODE_ENV=development

# Frontend origin-уудыг таслалаар тусгаарлаж жагсаах
CORS_ORIGIN=http://localhost:3000
```

### Frontend — `Bio-Puzzle-Frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## 4. Authentication ба CORS

### Урсгал

```
[Browser]                       [Frontend]                  [Backend]
   │  POST /login /register         │                            │
   ├──────────────────────────────►│ fetch → /auth/login        │
   │                               ├───────────────────────────►│ bcrypt + sign JWT
   │◄───────────────────────────────┤◄───────────────────────────┤ { token, user }
   │  AuthProvider хадгалах         │ localStorage (`bio_*`)     │
   │                               │                            │
   │  тоглоом / API хүсэлтүүд       │                            │
   │                               │ Authorization: Bearer JWT  │
   │                               ├───────────────────────────►│ jwt.verify(sub)
   │                               │                            │ requireAuth → req.userId
   │                               │◄───────────────────────────┤ JSON
```

### CORS

Backend нь `cors` middleware-тэй. `CORS_ORIGIN` орчны хувьсагчид
заасан origin-ууд л дуудаж чадна.

```ts
app.use(
  cors({
    origin: process.env.CORS_ORIGIN.split(","),
    credentials: true,
  }),
);
```

### Protected vs Public

- **Public** (auth шаардлагагүй):
  `GET /health`, `GET /levels`, `GET /levels/:id`,
  `GET /scores/leaderboard/:levelId`, `POST /auth/register`,
  `POST /auth/login`
- **Protected** (`Authorization: Bearer <backend JWT>` заавал):
  бусад бүх endpoint.

Token байхгүй / буруу үед backend `401 Unauthorized` буцаана.

---

## 5. Алдааны формат

Бүх алдаа ижил JSON форматтай:

```json
{ "error": "Алдааны тайлбар" }
```

| Code | Утга                                            |
| ---: | ----------------------------------------------- |
|  200 | OK — амжилттай                                  |
|  201 | Created — шинэ объект үүссэн                    |
|  204 | No Content — амжилттай, body буцаахгүй          |
|  400 | Bad Request — body буруу эсвэл validation алдаа |
|  401 | Unauthorized — token байхгүй / хүчингүй         |
|  404 | Not Found — объект олдсонгүй                    |
|  500 | Internal Server Error                           |

---

## 6. Endpoint-ууд

### 6.1 Public

#### `GET /health`

Сервер амьд эсэх, uptime-г буцаана.

**Response 200:**

```json
{ "status": "ok", "uptime": 12.34 }
```

---

### 6.2 Auth register / login

#### `POST /auth/register`

Шинэ хэрэглэгчийн мөрийг DB-д үүсгээд JWT буцаана.

**Body:**

```json
{
  "email": "you@example.com",
  "password": "minEightChars",
  "username": "optional"
}
```

`username`-г заавал бичэх албагүй (имэйлнээс суурь нэр үүсгэнэ).

**Response 201:**

```json
{
  "token": "<jwt>",
  "user": {
    "id": "...",
    "email": "...",
    "username": "...",
    "streak": 0,
    "age": null,
    "createdAt": "..."
  }
}
```

Имэйл давхардвал `409`-тай `{ "error": "Email already registered" }`.

---

#### `POST /auth/login`

**Body:**

```json
{ "email": "you@example.com", "password": "…" }
```

**Response 200:** `register`-тэй ижил `{ token, user }` бүтэц.

**Response 401:** `{ "error": "Invalid email or password" }` — буруу нууц эсвэл
DB-д түүхийн мөр `passwordHash` хоосон үед бас ижилхэн 401 буцааж болно.

---

### 6.3 Users routes — `/users`

Бүх endpoint **auth шаардлагатай**. Токен байх үедээ Prisma-д хадгалсан
энэхүү `User` мөрийг л буцаадаг (`sub` claim нь DB-ийн user `id`).

#### `GET /users/me`

**Response 200:**

```json
{
  "id": "cuid…",
  "username": "john",
  "email": "john@example.com",
  "streak": 0,
  "age": null,
  "createdAt": "2026-05-05T03:00:00.000Z"
}
```

#### `PATCH /users/me`

**Body** (бүгд optional):

```json
{ "username": "new_name", "age": 21 }
```

**Response 200:** Шинэчилсэн хэрэглэгч.

#### `DELETE /users/me`

**Response 200:** `{ "message": "User deleted" }`

> Cascade тул хэрэглэгчийн бүх `GameSession`, `Score`, `UserLessonProgress`, `UserQuizBest` бичлэгүүд хамт устана.

---

### 6.4 Levels routes — `/levels`

Тоглоомын **түвшин (level / puzzle)**-г удирдах endpoint-ууд.

#### `GET /levels` _(public)_

Бүх level-ийг шинэхнээс эхлэн буцаана.

**Response 200:**

```json
[
  {
    "id": 1,
    "title": "DNA Puzzle 1",
    "difficulty": "easy",
    "data": { "pieces": [], "answer": [] },
    "createdAt": "2026-05-05T03:00:00.000Z"
  }
]
```

#### `GET /levels/:id` _(public)_

**Response 200:** Дээрхтэй ижил, нэг объект.
**Response 404:** `{ "error": "Level not found" }`

#### `POST /levels` _(auth)_

**Body:**

```json
{
  "title": "DNA Puzzle 2",
  "difficulty": "medium",
  "data": { "pieces": [], "answer": [] }
}
```

**Response 201:** Үүссэн level.

#### `PATCH /levels/:id` _(auth)_

**Body** (бүх талбар optional): `{ "title", "difficulty", "data" }`

#### `DELETE /levels/:id` _(auth)_

**Response 200:** `{ "message": "Level deleted" }`

---

### Curriculum — `/curriculum`

Frontend-тэй `/lib/curriculumApi.ts` ба bootstrap хариун дахь агуулгыг тааруулахын тулд DB-с уншина.
Өгөгдлийг оруулах: `npm run db:seed` (шинэ хүснэгтүүд үүссэн байх ёстой).

> **Deploy:** production-д `npm run db:deploy` эсвэл `render:start` доторх `prisma migrate deploy`. Шинэ migration: `20260509100000_user_stats_and_score_unique` (User статистик талбарууд, Score хэрэглэгч тутамд нэг level-д нэг мөр).
> **Neon / production:** хичээлүүд Postgres **`curriculum_lesson`** хүснэгтэнд (`chapterId`).
> Migration түүх төгс нийцэхгүй бол (`migrate drift`) эхлээд `prisma migrate resolve` эсвэл SQL-ийг гараар тааруулна.

#### `GET /curriculum/bootstrap`

**Headers (сонголттой):** `Authorization: Bearer <JWT>` — байвал `UserLessonProgress`-оос хичээл бүрийн `isCompleted`, `stars`, түгжээ (бүлэг/дараалал дахь хичээл) тооцож нэгтгэнэ. Байхгүй бол зочны горим (зөвхөн эхний бүлэг түгжээгүй).

**Response 200:**

```json
{
  "chapters": [
    {
      "id": "teeth",
      "titleMn": "…",
      "sortOrder": 0,
      "isUnlocked": true,
      "isCompleted": false,
      "progress": 40,
      "totalLessons": 5,
      "completedLessons": 2
    }
  ],
  "lessonsByChapter": {
    "teeth": [
      {
        "id": "teeth-1",
        "titleMn": "…",
        "isUnlocked": true,
        "isCompleted": true,
        "stars": 3,
        "question": "…",
        "options": [],
        "correctAnswer": 0
      }
    ]
  },
  "teethGameParts": {}
}
```

Жагсаалт / профайлын хиймэл JSON энд байхгүй — тусад нь `GET /leaderboard/global`, `GET /users/me/profile`.

#### `GET /curriculum/chapters`

Дээрхтэй адил **`optionalAuth`** — JWT байвал явцтай нэгтгэсэн бүлгийн жагсаалт.

#### `GET /curriculum/chapters/:chapterId/lessons`

Тухайн бүлгийн хичээлүүд (явцтай нэгтгэсэн).

---

### Явц / жагсаалт — `/progress`, `/leaderboard`

#### `POST /progress/chapter-quiz` _(auth)_

Бүлгийн асуулга дуусахад: `UserLessonProgress`, оноо, streak, `User.quizBest` (`chapter:<id>`).

**Body:** `{ "chapterId": "teeth", "correctCount": 8, "totalCount": 10 }`

#### `POST /progress/mini-game` _(auth)_

Жижиг тоглоом (`tooth-quiz`, `tooth-label`, `skeleton`): `UserQuizBest`, оноо + streak.

#### `GET /leaderboard/global` _(public, Bearer сонголттой)_

`User.totalPoints` болон skeleton-ийн жинхэнэ хурдаар эрэмбэлсэн топ жагсаалт. Bearer байвал `isCurrentUser` зөв тохируулна.

**Response:** `{ "entries": [...], "totalUsers": N, "me": null | { rank, totalPoints, … } }`

---

### 6.5 Sessions routes — `/sessions`

**Хэрэглэгчийн тоглоомын явц** — тухайн level-ийг хагас тоглоод
хадгалсан төлөв. Бүгд **auth шаардлагатай**.

> `@@unique([userId, levelId])` — нэг хэрэглэгч нэг level дээр зөвхөн
> **нэг идэвхтэй session**-тай байна.

#### `GET /sessions`

**Response 200:**

```json
[
  {
    "id": "cuid…",
    "userId": "cuid…",
    "levelId": 1,
    "currentState": { "boardState": [] },
    "isCompleted": false,
    "timeElapsed": 120,
    "moves": 15,
    "createdAt": "2026-05-05T03:00:00.000Z",
    "updatedAt": "2026-05-05T03:05:00.000Z",
    "level": {
      "id": 1,
      "title": "DNA Puzzle 1",
      "difficulty": "easy",
      "data": {}
    }
  }
]
```

#### `POST /sessions` _(upsert)_

Шинэ session үүсгэх **эсвэл** одоо байгаа `currentState`-г шинэчилнэ.

**Body:**

```json
{
  "levelId": 1,
  "currentState": { "boardState": [], "selected": [] }
}
```

**Response 201:** Session объект.

#### `PATCH /sessions/:id`

Тоглоомын явцад тогтмол хугацаанд (auto-save) дуудна.

**Body** (бүх талбар optional):

```json
{
  "currentState": {},
  "isCompleted": true,
  "timeElapsed": 180,
  "moves": 25
}
```

#### `DELETE /sessions/:id`

Хэрэглэгч "Reset" дарахад. **Response 200:** `{ "message": "Session deleted" }`

---

### 6.6 Scores routes — `/scores`

#### `GET /scores/leaderboard/:levelId` _(public)_

Тухайн level-ийн **топ 10 оноо**.

**Response 200:**

```json
[
  {
    "id": "cuid…",
    "userId": "cuid…",
    "levelId": 1,
    "points": 950,
    "timeSeconds": 45,
    "completedAt": "2026-05-05T03:00:00.000Z",
    "user": { "username": "john" }
  }
]
```

#### `GET /scores/me` _(auth)_

Нэвтэрсэн хэрэглэгчийн бүх онооны түүх (хамгийн сүүлийнхээс эхлэн),
`level` мэдээллийг хамт.

#### `POST /scores` _(auth)_

Level дуусгасны дараа дуудна.

**Body:**

```json
{ "levelId": 1, "points": 950, "timeSeconds": 45 }
```

**Response 201:** Үүссэн оноо.

#### `DELETE /scores/:id` _(auth)_

**Response 200:** `{ "message": "Score deleted" }`

---

## 7. Endpoint-ийн хүснэгт (товч)

| Метод    | Зам                            | Auth | Тайлбар                      |
| -------- | ------------------------------ | :--: | ---------------------------- |
| `GET`    | `/health`                      |  —   | Сервер амьд эсэх             |
| `POST`   | `/auth/register`               |  —   | Бүртгэл + JWT буцаах         |
| `POST`   | `/auth/login`                  |  —   | Нэвтрэлт + JWT буцаах        |
| `GET`    | `/users/me`                    |  ✅  | Өөрийн профайл (totalPoints, level, …) |
| `GET`    | `/users/me/profile`           |  ✅  | UI профайл + badge + character       |
| `PATCH`  | `/users/me`                    |  ✅  | username, age, displayNameMn, profileExtras |
| `DELETE` | `/users/me`                    |  ✅  | Өөрийгөө устгах              |
| `GET`    | `/levels`                      |  —   | Бүх level-ийн жагсаалт       |
| `GET`    | `/levels/:id`                  |  —   | Нэг level авах               |
| `POST`   | `/levels`                      |  ✅  | Шинэ level үүсгэх            |
| `PATCH`  | `/levels/:id`                  |  ✅  | Level шинэчлэх               |
| `DELETE` | `/levels/:id`                  |  ✅  | Level устгах                 |
| `GET`    | `/sessions`                    |  ✅  | Өөрийн бүх session           |
| `POST`   | `/sessions`                    |  ✅  | Session үүсгэх / upsert      |
| `PATCH`  | `/sessions/:id`                |  ✅  | Session шинэчлэх (auto-save) |
| `DELETE` | `/sessions/:id`                |  ✅  | Session устгах               |
| `GET`    | `/scores/leaderboard/:levelId` |  —   | Тухайн level-ийн топ 10      |
| `GET`    | `/scores/me`                   |  ✅  | Өөрийн онооны түүх           |
| `POST`   | `/scores`                      |  ✅  | Level оноо upsert (нэг user нэг level-д нэг мөр) |
| `DELETE` | `/scores/:id`                  |  ✅  | Оноо устгах                  |
| `GET`    | `/curriculum/bootstrap`       |  🔓  | Бүлэг + хичээл + teethGameParts (Bearer сонголттой явц) |
| `GET`    | `/curriculum/chapters`        |  🔓  | Бүлгүүд (Bearer сонголттой явц) |
| `GET`    | `/curriculum/chapters/:chapterId/lessons` | 🔓 | Хичээлүүд (Bearer сонголттой явц) |
| `POST`   | `/progress/chapter-quiz`      |  ✅  | Бүлгийн quiz явц + оноо      |
| `POST`   | `/progress/mini-game`         |  ✅  | Жижиг тоглоомын үр дүн      |
| `GET`    | `/leaderboard/global`         |  🔓  | Нийт жагсаалт (Bearer сонголттой) |

🔓 = JWT байж болно (заавал биш).

---

## 8. Frontend интеграци

Roadmap болон хичээлийн текстүүдийг frontend кодонд статикаар хадгалахгүй — **`NEXT_PUBLIC_API_URL`** зааж backend асах үед бүх агуулга **`GET /curriculum/bootstrap`**-оос ирнэ (SSR/metadata-д ч адил `lib/curriculumApi.ts`). Backend унтарсан/буруу URL-тэй үед хэрэглэгч алдааны мессеж харна.

`next build` сервер дээр curriculum-д зориулсан хүснэгтүүд дүүрсэн байгаа DB-тэй backend хандах боломжтой байхыг анхаар (эсвэл `generateStaticParams` хоосон болно).

Гол хэсэг нь клиентийн **AuthProvider** + **Bearer token**:

### 8.1 Client component-д — `lib/api.ts`

`useApi()` hook нь `AuthProvider`-оос JWT авч header-т автоматаар залгадаг.

```tsx
"use client";
import { useApi } from "@/lib/api";
import type { Level, Score } from "@/lib/types";

export function LevelsList() {
  const api = useApi();

  async function load() {
    const levels = await api.get<Level[]>("/levels");
    console.log(levels);
  }

  async function submitScore(levelId: number) {
    await api.post<Score>("/scores", {
      levelId,
      points: 950,
      timeSeconds: 45,
    });
  }
  // ...
}
```

API: `api.get<T>(path)`, `api.post<T>(path, body?)`,
`api.patch<T>(path, body?)`, `api.delete<T>(path)`.

`app/login/page.tsx` болон `app/register/page.tsx` нь `/auth/login` ба
`/auth/register` руу шууд `fetch` хийж буцааж ирсэн `token`-ийг
`login()` дамжуулаарай.

### 8.2 Server component / SSR

JWT одоогоор **`localStorage`-д л** хадгалагддаг (`bio_auth_token_v1`).
Server component-ээс автоматаар header залгадаг тусыг суулгаагүй — шаардлагатай
талд дараагийн үе шатанд httpOnly cookie руу шилжүүлнэ.

### 8.3 Аль файлууд интеграцид оролцдог вэ?

```
Bio-Puzzle-Frontend/
├── proxy.ts                    ← Next 16 middleware (энэ төсөлд pass-through)
├── app/
│   ├── layout.tsx              ← <AuthProvider>
│   ├── dashboard/layout.tsx    ← Login / Register / Гарах
│   ├── login/page.tsx          ← имэйл + нууц үгээр нэвтрэх
│   └── register/page.tsx       ← бүртгэл үүсгэх
└── lib/
    ├── api.ts                  ← useApi()
    ├── auth-context.tsx       ← login / logout + /users/me sync
    ├── api-url.ts             ← NEXT_PUBLIC_API_URL
    └── types.ts                ← TS типүүд
```

---

## 9. Өгөгдлийн моделүүд (TS типүүд)

`Bio-Puzzle-Frontend/lib/types.ts`-аас:

```ts
export interface User {
  id: string;
  username: string;
  email: string;
  streak?: number;
  age?: number | null;
  createdAt: string;
}

export interface Level {
  id: number;
  title: string;
  difficulty: "easy" | "medium" | "hard" | string;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface GameSession {
  id: string;
  userId: string;
  levelId: number;
  currentState: Record<string, unknown>;
  isCompleted: boolean;
  timeElapsed: number;
  moves: number;
  createdAt: string;
  updatedAt: string;
  level?: Level;
}

export interface Score {
  id: string;
  userId: string;
  levelId: number;
  points: number;
  timeSeconds: number;
  completedAt: string;
  user?: { username: string };
  level?: Level;
}

export interface ApiError {
  error: string;
}
```

---

## 10. Тоглоомын ердийн урсгал

```
1. Хэрэглэгч `/register` эсвэл `/login` → POST /auth/* → JWT + профайлыг контекстод хадгална

2. GET /levels        — гарын хуудсанд бүх puzzle харуулна
3. GET /levels/:id    — тодорхой puzzle сонгох
4. POST /sessions     — currentState үүсгэх (auto-save эхлэл)
5. PATCH /sessions/:id (давталттай) — currentState, timeElapsed, moves
6. Тоглоом дуусгах:
   ├─ PATCH /sessions/:id  { isCompleted: true }
   └─ POST /scores         { levelId, points, timeSeconds }
7. GET /scores/leaderboard/:levelId — Топ 10-д орсон эсэхийг үзүүлэх
```

---

## 11. Алдаа засах гарын авлага

| Шинж тэмдэг                                   | Шалтгаан / Засвар                                                                                               |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `EADDRINUSE :4000`                            | Backend port давхардсан. `taskkill /PID … /F` эсвэл `.env`-д `PORT` өөрчилнө.                                   |
| Browser-д `CORS error`                        | Frontend-ийн origin нь backend-ийн `CORS_ORIGIN` жагсаалтад байхгүй. `.env`-д нэмж backend-ийг restart хийнэ.   |
| `401 Unauthorized`                            | JWT байхгүй / хугацаа дууссан / буруу `JWT_SECRET`. Client-д нэвтэрсэн эсэх, `Authorization: Bearer`-ийг шалга. |
| `500 The column "Level.title" does not exist` | DB schema хуучирсан. `npx prisma migrate dev` эсвэл `npx prisma db push` ажиллуулна.                            |
| `JWT_SECRET must be set`                      | Backend `.env`-д дор хаяж 16 тэмдэгттэй санамсаргүй `JWT_SECRET` заавал.                                        |
| Registered email already exists               | Өмнөх мөр үлдсэн. Prisma Studio-оор давхардсан имэйлтэй мөр устгана эсвэл өөр имэйл ашиглана.                   |
| Login үргэлж 401                              | DB мөрөн дээр `passwordHash` null — шинэ бүртгэл эсвэл мөрийг цэвэрлэнэ уу.                                     |
