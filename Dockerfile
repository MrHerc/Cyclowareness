# Cyclowareness + ZORBOX — single-image build for Render (one service, one URL).
#
# Stage 1 compiles the React frontend. Stage 2 is the Python API, which serves
# that compiled frontend itself (see app/main.py), so there is no second service
# and no CORS: the SPA and the /api/ws WebSocket share one origin.

# --- stage 1: frontend ---------------------------------------------------------
FROM node:22-slim AS frontend
WORKDIR /fe
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build            # -> /fe/dist

# --- stage 2: api + static ------------------------------------------------------
FROM python:3.12-slim
WORKDIR /app

# `unrar` lets the archive analyzer read RAR contents. Without it the RAR path
# degrades to an honest "unavailable" (see sandbox/archives.py); it is not
# required, only better. Everything else the analyzers need is a pip wheel.
RUN apt-get update \
 && apt-get install -y --no-install-recommends unrar-free \
 && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt "psycopg[binary]>=3.2"

COPY backend/app ./app
# The compiled SPA, where main.py looks for it.
COPY --from=frontend /fe/dist ./frontend_dist

# Quarantine lives on the container's ephemeral disk by default. Mount a Render
# disk here and set ZORBOX_QUARANTINE to it if samples must survive a redeploy —
# for a demo, ephemeral is fine (and means uploaded malware never persists).
ENV ZORBOX_QUARANTINE=/tmp/zorbox-quarantine

EXPOSE 8000
# Render supplies $PORT; default to 8000 for local `docker run`.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
