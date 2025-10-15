# Fantasy Dice Chamber

A real-time virtual dice roller for tabletop RPGs using Flask-SocketIO with eventlet. Built with uv and designed for local or containerised runs.

## Demo

![Demo](./extras/preview.gif)
*Animation shows dice rolling with real-time updates across connected players*

## Overview

Users can roll a variety of dice in a shared room and see results in real time. A simple GM mode is available. The app includes a `/health` endpoint and can run with Gunicorn using the eventlet worker for WebSocket support.

## Architecture at a glance

- Flask app with Socket.IO server and `app:app` WSGI target
- eventlet async mode for WebSockets
- Health endpoint `GET /health`

## Features

- Real-time shared dice rolls across connected clients
- Multiple dice types with themed interface
- GM mode and optional room control
- Roll history display
- `/health` endpoint for liveness checks
- Works with Gunicorn eventlet worker
- Prebuilt container image on GHCR

## Prerequisites

- [Docker](https://www.docker.com/)
- (Alternatively) [uv](https://docs.astral.sh/uv/) and Python 3.13 for local development

## Quick start

Local development with uv

```bash
uv sync --all-extras
uv run python -m app
```

## Docker

Pull and run

```bash
docker pull ghcr.io/sudo-kraken/fantasy-dice-chamber:latest
docker run --rm -p 5000:5000 \
  -e PORT=5000 \
  ghcr.io/sudo-kraken/fantasy-dice-chamber:latest
```

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | no | 5000 | Port to bind |
| GM_PASSWORD | no |  | Password used for GM mode |
| FLASK_DEBUG | no | 0 | Enable debug in local runs |

`.env` example

```dotenv
PORT=5000
GM_PASSWORD=replace-me
```

## Health

- `GET /health` returns `{ "ok": true }`

## Production notes

- Use the eventlet worker for WebSocket support when running under Gunicorn.
- If deploying behind a reverse proxy, enable ProxyFix or equivalent so that remote IPs and scheme are preserved.

## Development

```bash
uv run ruff check --fix .
uv run ruff format .
uv run pytest --cov
```

## Troubleshooting

- If WebSockets do not upgrade, verify you are using the eventlet worker and that your proxy allows WebSocket upgrade headers.
- For cross origin issues, review any CORS settings you have applied.

## Licence
See [LICENSE](LICENSE)

## Security
See [SECURITY.md](SECURITY.md)

## Contributing
Feel free to open issues or submit pull requests if you have suggestions or improvements.
See [CONTRIBUTING.md](CONTRIBUTING.md)

## Support
Open an [issue](/../../issues)

---

*Fantasy Dice Chamber is not affiliated with Games Workshop, Wizards of the Coast, or any official Warhammer or Dungeons & Dragons product.*

