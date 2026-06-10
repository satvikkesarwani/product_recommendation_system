# Product Recommendation System

React + Express product recommendation app that:

- loads products from `electronics_product.csv`
- uses an AI model only for structured preference extraction
- filters and ranks products locally in Node.js
- supports category-based browsing for a faster homepage

## Project Structure

- `frontend/` — Vite + React UI
- `backend/` — Express API
- `electronics_product.csv` — source dataset
- `render.yaml` — Render Blueprint for deployment

## Local Development

### Backend

```bash
cd backend
npm install
cp .env.example .env
# fill in your API key(s)
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Local URLs:

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:5000`

## Render Deployment

This repo is set up for **Render Blueprint deployment** with:

- one **Web Service** for the backend
- one **Static Site** for the frontend

### Files prepared for Render

- `render.yaml`
- `backend/.env.render.example`
- `frontend/.env.production.example`

### Recommended Deploy Flow

#### 1. Push this repo to GitHub

Make sure your latest changes are committed and pushed.

#### 2. Create a new Blueprint on Render

In Render:

- click **New**
- choose **Blueprint**
- connect your GitHub repo
- Render will detect `render.yaml`

#### 3. Fill the required environment variables

Render will prompt you for:

- `NVIDIA_API_KEY`
- `VITE_API_BASE_URL`

Use:

- `NVIDIA_API_KEY` = your NVIDIA API key
- `VITE_API_BASE_URL` = your backend public URL

Recommended initial backend URL:

- `https://product-recommender-api.onrender.com`

If Render assigns a different backend subdomain, update `VITE_API_BASE_URL` in the frontend static site settings after the first deploy and redeploy the frontend.

#### 4. Deploy

Render will create:

- `product-recommender-api`
- `product-recommender-web`

### Render Service Settings

#### Backend Web Service

- Name: `product-recommender-api`
- Runtime: Node
- Build Command: `cd backend && npm install`
- Start Command: `cd backend && npm start`
- Health Check Path: `/health`

#### Frontend Static Site

- Name: `product-recommender-web`
- Build Command: `cd frontend && npm install && npm run build`
- Publish Directory: `frontend/dist`

### Production Environment Variables

#### Backend

Required:

- `AI_PROVIDER=nvidia`
- `NVIDIA_API_KEY=...`
- `NVIDIA_MODEL=meta/llama-3.1-70b-instruct`
- `HOST=0.0.0.0`
- `NODE_ENV=production`
- `USD_TO_INR=83`

Optional:

- `CORS_ORIGIN=https://your-frontend-site.onrender.com`

If `CORS_ORIGIN` is omitted, the backend currently allows public cross-origin access. That is acceptable for this demo app, but for stricter production deployment you should set it to your frontend URL.

#### Frontend

Required:

- `VITE_API_BASE_URL=https://your-backend-site.onrender.com`

## Post-Deploy Checks

After deployment:

### Backend

Open:

- `https://your-backend-site.onrender.com/health`

Expected shape:

```json
{
  "status": "ok",
  "productsLoaded": 9530,
  "provider": "nvidia",
  "model": "meta/llama-3.1-70b-instruct"
}
```

### Frontend

Open your static site and verify:

- products load
- category filters appear under **All Products**
- category switching updates the product grid quickly
- recommendation requests return results

## Notes for Render

- The frontend uses `/api` only in local dev through the Vite proxy.
- In production on Render, the frontend uses `VITE_API_BASE_URL`.
- The backend reads the dataset directly from the repo root, so the Blueprint keeps the repo root available during build/deploy.

## Deployment Readiness

This project has been checked for:

- frontend production build success
- backend startup success
- CSV loading success
- `GET /health`
- `GET /products`
- `POST /recommend`
- invalid-input handling for empty queries
- recommendation quality checks for:
  - phone under budget
  - gaming laptop
  - headphones for music

## Security Note

Your NVIDIA API key was shared in-thread earlier. Before public launch, rotate it and use the new value in Render.
