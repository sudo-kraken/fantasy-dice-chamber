FROM ghcr.io/astral-sh/uv:0.9-python3.13-bookworm-slim@sha256:661ae5d98b045922b10684e22214cbeabe38d5bcdc900025d4c3e8174b304511

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

RUN adduser --disabled-password --gecos "" --home /nonroot --uid 10001 appuser
 
WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY app ./app

RUN chown -R appuser:appuser /app
USER appuser

ENV PORT=5000 \
    WEB_CONCURRENCY=2
    
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/health" || exit 1

CMD ["sh", "-c", "uv run gunicorn --preload -k eventlet -w ${WEB_CONCURRENCY:-2} -b 0.0.0.0:${PORT:-5000} app.wsgi:app"]
