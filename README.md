# Academic Data Processing Suite

Premium full-stack academic data workspace with a React frontend, FastAPI backend, Firebase-ready authentication, reusable Sort Machine presets, and desktop support.

## What Works

- Account creation and login
- Firebase-ready authentication flow
- Animated workspace startup screen
- Upload CSV or Excel files
- Drag and drop upload interaction
- Preview uploaded data
- Detect messy headers
- Remove unwanted records by keyword
- Standardize values and case
- Select export columns
- Rename headers
- Save reusable Sort Machine presets
- Split outputs into sheets or zipped files
- Export cleaned output as `XLSX`, `CSV`, or `ZIP`

The live end-to-end workbench is the **Sort Machine** page. The other modules are scaffolded around the same visual system and backend architecture.

## Structure

```text
academic-data-processing-suite/
  frontend/   React + Vite + Tailwind + motion-driven UI
  backend/    FastAPI + pandas + openpyxl + xlsxwriter
```

## Frontend

Fastest root-level launch from Git Bash:

```bash
npm run dev
```

That starts the backend and frontend dev servers from the repo root and writes logs to `backend.dev.log` and `frontend.dev.log`.

```bash
cd frontend
npm install
npm run build
python serve_dist.py
```

Open:

```bash
http://127.0.0.1:4174
```

The app auto-resolves the backend host from the current browser host. Only set `VITE_API_BASE_URL` if you want a custom API origin.

Firebase frontend config:

```bash
copy .env.example .env
```

Fill in:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

If these values are present, the frontend uses Firebase Auth. If they are not present, it falls back to the local FastAPI auth flow.

Optional dev server:

```bash
cd frontend
npm run dev
```

Note: in this workspace path, `npm run dev` may hit a Windows `EPERM` issue. The reliable local path is `npm run build` plus `python serve_dist.py`.

## Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

Backend URL:

```bash
http://127.0.0.1:8000
```

Firebase backend config:

```bash
copy .env.example .env
```

Use either:

- `FIREBASE_SERVICE_ACCOUNT_PATH`

or:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

When backend Firebase config is present, FastAPI verifies Firebase ID tokens for protected routes. The current local auth remains available as a fallback path if Firebase config is absent.

## Desktop App

```bash
cd frontend
npm install
npm run desktop
```

The desktop shell serves the built frontend internally and starts the FastAPI backend automatically if it is not already running.

## Test With Actual Data

1. Start the backend.
2. Start the frontend build server.
3. Open `http://127.0.0.1:4174`.
4. Create an account or sign in.
5. Open `Sort Machine`.
6. Upload your CSV or Excel file.
7. Confirm the source preview and messy header detection.
8. Apply keyword cleanup, case cleanup, column renames, and split rules.
9. Run export and download the final file.

## Core Backend Endpoints

- `GET /api/auth/status`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/files/upload`
- `POST /api/files/sample`
- `GET /api/files/{file_id}/sheets`
- `GET /api/files/{file_id}/preview`
- `POST /api/modules/splitter/run`
- `POST /api/modules/nysc-sorter/run`
- `POST /api/modules/admission-confirmation/run`
- `POST /api/modules/sort-machine/run`
- `GET /api/exports/history`
- `GET /api/exports/{export_id}/download`
- `GET /api/presets/templates`
- `POST /api/presets/templates`
- `GET /api/presets/rules`
- `POST /api/presets/rules`

## Design Direction

- Deep navy sidebar
- Glassmorphism cards
- Blue / teal accent system
- Rounded enterprise surfaces
- Smooth table motion and sticky headers
- Wizard-like workbench flow

## Notes

- Uploaded files, generated exports, presets, sessions, and user records are stored under `backend/storage/`.
- Header normalization happens server-side.
- The Sort Machine flow has been verified with a real CSV upload and zipped split export.
