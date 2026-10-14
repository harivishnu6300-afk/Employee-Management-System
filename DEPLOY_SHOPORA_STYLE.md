# Employee Management System — simplified SQLite deployment

This edition replaces the MySQL/TiDB connection adapter with SQLite and keeps the existing Express routes/controllers and JWT auth interface.

## Important hosting limitation

This project follows the Shopora-style SQLite approach. On Vercel, the database is placed under `/tmp/employee-management-data/employee_management.sqlite` when `VERCEL` is set. Vercel serverless `/tmp` storage is **ephemeral and not shared reliably across separate function instances**. This is suitable only for a quick demo/test; accounts or employee changes may disappear or appear inconsistent after a cold start or on another instance. Do not use this mode for real HR records. For durable production data, use a persistent disk/managed database or a hosting service with persistent storage.

## Deploy backend

1. Import the project repository into Vercel as a separate project.
2. Set **Root Directory** to `backend`.
3. Add Environment Variables:
   - `JWT_SECRET`: generate locally with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
   - `JWT_EXPIRES_IN`: `7d`
   - `NODE_ENV`: `production`
   - `CLIENT_URL`: the full frontend URL, e.g. `https://YOUR-FRONTEND-DOMAIN.vercel.app`
4. Deploy. Open `/` and `/api/health`. SQLite health should report connected if the function can initialize the database.

## Deploy frontend

1. Create a separate Vercel project from the same repository.
2. Set **Root Directory** to `frontend`.
3. Add `VITE_API_URL` with the backend origin and `/api` suffix, e.g. `https://YOUR-BACKEND-DOMAIN.vercel.app/api`.
4. Deploy/redeploy.

## Local run

Terminal 1:

```bash
cd backend
npm install
npm start
```

Terminal 2:

```bash
cd frontend
npm install
npm run dev
```

For local persistence, SQLite is stored in `backend/data/employee_management.sqlite` by default. Do not upload `.env` files or real employee data into a public repository.

## What was changed

- Replaced `mysql2` pool with a small SQLite adapter that preserves the controllers' `pool.query()` / `getConnection()` shape.
- Added SQLite schema and required role/department lookup rows.
- Kept the existing API route/controller files and JWT auth flow.
- Added Vercel routing config for the backend.

## Verification status

The converted SQLite schema was checked for successful creation of all 10 tables using SQLite. Full application/build/authentication tests were **not run in this environment** because the dependency install did not complete. Test login/register and core pages after deployment before relying on the app.
