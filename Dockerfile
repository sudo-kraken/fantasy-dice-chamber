FROM ghcr.io/astral-sh/uv:0.9-python3.13-bookworm-slim@sha256:bf39f30fb4598ceff268ef845db12d8ea373405b4fbe99056dd198dcfc7c61af

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
