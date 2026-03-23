# ContentAI Server

Production-ready Express backend with JWT auth, HTTP-only cookies, bcrypt, and Google OAuth.

## Stack

- **Express** — HTTP server
- **bcryptjs** — Password hashing (12 salt rounds)
- **jsonwebtoken** — Access tokens (15 min) + Refresh tokens (7 days)
- **cookie-parser** — HTTP-only cookie management
- **passport + passport-google-oauth20** — Google OAuth 2.0
- **express-rate-limit** — Brute-force protection (10 req / 15 min on auth routes)
- **helmet** — Security headers
- **lowdb** — JSON file database (easy to swap with PostgreSQL)

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```

Edit `.env` and fill in:

#### Generate secure secrets
```bash
node -e "const c=require('crypto'); console.log(c.randomBytes(64).toString('hex'))"
```
Run this 3 times for `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `COOKIE_SECRET`.

#### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID (Web application)
4. Add Authorized redirect URI: `http://localhost:4000/auth/google/callback`
5. Copy Client ID and Secret into `.env`

### 3. Run development server
```bash
npm run dev
```

Server starts at **http://localhost:4000**

---

## API Reference

### Auth Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | ❌ | Register with email + password |
| POST | `/auth/login` | ❌ | Login, sets HTTP-only cookies |
| POST | `/auth/logout` | ✅ | Clears cookies, revokes refresh token |
| POST | `/auth/logout-all` | ✅ | Revokes all sessions for user |
| POST | `/auth/refresh` | ❌ | Rotate refresh token, issue new access token |
| GET | `/auth/me` | ✅ | Get current user from token |
| GET | `/auth/google` | ❌ | Redirect to Google OAuth |
| GET | `/auth/google/callback` | ❌ | Google OAuth callback |

### User Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users/profile` | ✅ | Get full profile |
| PATCH | `/users/profile` | ✅ | Update name/avatar |
| GET | `/users/usage` | ✅ | Get generation usage stats |

### Health Check
```
GET /health → { status: "ok", timestamp: "..." }
```

---

## Token Strategy

```
Login/Register
     │
     ├── access_token  (httpOnly cookie, 15 min)   ← used for API requests
     └── refresh_token (httpOnly cookie, 7 days)   ← rotated on each use

Access token expires
     │
     └── POST /auth/refresh
              │
              ├── Old refresh token revoked
              └── New access_token + refresh_token issued
```

- Access tokens are **short-lived** (15 min) — minimal damage if leaked
- Refresh tokens are **single-use** (rotated on every refresh) — prevents replay attacks
- Both cookies are **httpOnly** — inaccessible to JavaScript, protected from XSS

---

## Swapping to PostgreSQL

Replace `src/config/db.js` with a `pg` or `prisma` client:

```bash
npm install pg
# or
npm install prisma @prisma/client
```

Then update `UserModel` in `src/models/user.js` to use SQL queries instead of lowdb.

---

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong random secrets for `JWT_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET`
- [ ] Enable `secure: true` on cookies (requires HTTPS)
- [ ] Swap lowdb for PostgreSQL or MongoDB
- [ ] Add proper logging (Winston, Pino)
- [ ] Set up rate limiting per user/IP at infrastructure level
- [ ] Configure reverse proxy (nginx) with SSL termination
- [ ] Add email verification flow
- [ ] Add password reset flow
