# Cyclowareness — single-image build for Render (one service, one URL).
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
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/alembic.ini .
COPY backend/migrations ./migrations
COPY backend/app ./app
# The compiled SPA, where main.py looks for it.
COPY --from=frontend /fe/dist ./frontend_dist

# Quarantine lives on the container's ephemeral disk by default. Mount a Render
# disk here and point SANDBOX_QUARANTINE at it if samples must survive a
# redeploy — for a demo, ephemeral is fine (and means uploaded malware never
# persists).
#
# THE NAME IS THE WHOLE POINT. This baked `ZORBOX_QUARANTINE`, a variable no
# code reads: `engine/storage.py::quarantine_root` reads `SANDBOX_QUARANTINE`
# and nothing else. The live deployment escaped only because render.yaml sets
# the right one — but the comment above told an operator to mount a disk and set
# the wrong one, so anybody following this file to persist samples got a
# quarantine still on ephemeral /tmp and lost every sample on redeploy, with
# nothing reporting a fault. The rename that produced this was supposed to reach
# everywhere; this file was the one place it did not.
ENV SANDBOX_QUARANTINE=/tmp/cyclowareness-quarantine

EXPOSE 8000
# Render supplies $PORT; default to 8000 for local `docker run`.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
