FROM ghcr.io/astral-sh/uv:0.9-python3.13-bookworm-slim@sha256:7072fbb9cf84e6b76bee43905c27a1cf4afa48bfa49de3cb2b57f748ada6cc10

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY pyproject.toml uv.lock ./

RUN uv sync --frozen --no-dev --no-install-project

COPY . .

RUN adduser --disabled-password --gecos "" appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 5000

CMD ["uv", "run", "--no-dev", "python", "-m", "app"]
