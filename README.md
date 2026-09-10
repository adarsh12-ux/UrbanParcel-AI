# UrbanParcelAI

UrbanParcelAI is a React/Vite cadastral mapping prototype with a separate FastAPI processing service.

## Start the AI backend on Windows PowerShell

From the repository root:

```powershell
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000
```

Verify in a browser:

- http://localhost:8000/docs
- http://localhost:8000/health

The backend allows `http://localhost:5175`, `http://localhost:5173`, and `http://localhost:3000` by default. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `backend/.env` for persisted job updates and output storage. The service-role key is server-only and must never be placed in the frontend `.env`.

The first real inference downloads the configured Hugging Face model `nvidia/mit-b0`. If the model or required packages are unavailable, `/v1/process` returns a clear error and the UI displays `AI model is not configured yet.`; it never fabricates completion or features.

## Start the frontend

In a second PowerShell terminal:

```powershell
npm install
npm run dev -- --host localhost --port 5175
```

Root `.env` must contain the public Supabase settings and:

```dotenv
VITE_API_URL=http://localhost:8000
```

The upload workflow validates the GeoTIFF in the browser, stores it in Supabase Storage, checks `GET /health`, and sends the file to `POST /v1/process`. The processing page continues to poll the durable Supabase job row and only enables the GIS map after successful backend completion.

For the complete Supabase migration and workflow test, see [docs/processing-service.md](docs/processing-service.md) and [backend/README.md](backend/README.md).
