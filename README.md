<div align="center">
<img src="docs/assets/logo.png" align="center" width="144px" height="144px"/>

### Fantasy Dice Chamber

_A real-time virtual dice roller for tabletop RPGs using Flask-SocketIO with eventlet. Built with uv and designed for local or containerised runs._
</div>

<div align="center">

[![Docker](https://img.shields.io/github/v/tag/sudo-kraken/fantasy-dice-chamber?label=docker&logo=docker&style=for-the-badge)](https://github.com/sudo-kraken//fantasy-dice-chamber/pkgs/container//fantasy-dice-chamber) [![Python](https://img.shields.io/python/required-version-toml?tomlFilePath=https%3A%2F%2Fraw.githubusercontent.com%2Fsudo-kraken%2F/fantasy-dice-chamber%2Fmain%2Fpyproject.toml&logo=python&logoColor=yellow&color=3776AB&style=for-the-badge)](https://github.com/sudo-kraken/fantasy-dice-chamber/blob/main/pyproject.toml)
</div>

<div align="center">

[![OpenSSF Scorecard](https://img.shields.io/ossf-scorecard/github.com/sudo-kraken/fantasy-dice-chamber?label=openssf%20scorecard&style=for-the-badge)](https://scorecard.dev/viewer/?uri=github.com/sudo-kraken/fantasy-dice-chamber)

</div>

## Demo

![Demo](./extras/preview.gif)  
*Animation shows dice rolling with real-time updates across connected players*

## Contents

- [Demo](#demo)
- [Overview](#overview)
- [Architecture at a glance](#architecture-at-a-glance)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Docker](#docker)
- [Configuration](#configuration)
- [Health](#health)
- [Endpoint](#endpoint)
- [Production notes](#production-notes)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Licence](#licence)
- [Security](#security)
- [Contributing](#contributing)
- [Support](#support)
- [Disclaimer](#disclaimer)

## Overview

Users can roll a variety of dice in a shared room and see results in real time. A simple GM mode is available. The app includes a `/health` endpoint and can run with Gunicorn using the eventlet worker for WebSocket support.

## Architecture at a glance

- Flask app with Socket.IO server and `app.wsgi:app` WSGI target
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
- Alternatively [uv](https://docs.astral.sh/uv/) and Python 3.13 for local development

## Quick start

Local development with uv

```bash
uv sync --all-extras
uv run python -m app
```

Production with Gunicorn

```bash
uv run gunicorn -k eventlet -w 1 -b 0.0.0.0:5000 app.wsgi:app
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

## Endpoint

- `GET /health` for liveness checks

## Production notes

- Use the eventlet worker for WebSocket support when running under Gunicorn.
- If deploying behind a reverse proxy, enable ProxyFix or equivalent so that remote IPs and scheme are preserved.
- Ensure WebSocket upgrade headers are passed through by your proxy.
- Set a strong `GM_PASSWORD` if enabling GM features.

## Development

```bash
uv run ruff check --fix .
uv run ruff format .
uv run pytest --cov
```

## Troubleshooting

- If WebSockets do not upgrade, verify you are using the eventlet worker and that your proxy allows WebSocket upgrade headers.
- For cross origin issues, review any CORS settings you have applied.
- If the UI does not connect, check browser console logs and server logs for Socket.IO connection errors.

## Licence

This project is licensed under the MIT Licence. See the [LICENCE](LICENCE) file for details.

## Security

If you discover a security issue, please review and follow the guidance in [SECURITY.md](SECURITY.md), or open a private security-focused issue with minimal details and request a secure contact channel.

## Contributing

Feel free to open issues or submit pull requests if you have suggestions or improvements.
See [CONTRIBUTING.md](CONTRIBUTING.md)

## Support

Open an [issue](/../../issues) with as much detail as possible, including your environment details and relevant logs or output.

## Disclaimer

This tool provides a real-time dice rolling service intended for casual use. Always test changes in a non-production environment and secure your deployment appropriately if exposing it to the internet.
