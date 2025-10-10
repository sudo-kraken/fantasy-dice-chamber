# Fantasy Dice Chamber

A real-time virtual dice roller for tabletop RPGs, supporting both Dungeons & Dragons and Warhammer Fantasy game systems.

## Demo

![Demo](./extras/preview.gif)
*Animation shows dice rolling with real-time updates across connected players*

## Features

- **Multiple Dice Types**: Support for all standard RPG dice (d4, d6, d8, d10, d12, d20, d100)
- **Themed Interface**: Switch between D&D and Warhammer Fantasy themes
- **Real-time Rolling**: Animated dice rolls with synchronized results across all connected players
- **Game-specific Presets**: Quick access to common rolls for each system:
  - **D&D**: Attack rolls, damage, saving throws, skill checks, initiative
  - **Warhammer**: Characteristic tests, hit location, wound rolls, damage, casting
- **GM Mode**: Password-protected Game Master tools
  - Hidden rolls only visible to the GM
  - Complete roll history access
- **Character Persistence**: Saves character names across sessions
- **Roll History**: Track all dice results with timestamps

## Requirements

- Python 3.13 or higher recommended
- [uv](https://github.com/astral-sh/uv) for dependency and venv management
- Docker optional for containerised runs

> This project uses `pyproject.toml` and `uv.lock`. You do not need a `requirements.txt`. Although one is included.

## Quick start with uv

1. Install dependencies and set up the virtual environment:
   ```bash
     uv sync --extra dev
   ```

2. Run the application:
   ```bash
   uv run python -m app
   ```
   The server listens on `0.0.0.0:5000` by default. Visit http://localhost:5000.

3. Run the tests:
   ```bash
   uv run pytest
   ```
   With coverage:
   ```bash
   uv run pytest --cov --cov-report=term-missing
   ```

### Useful uv commands

- Update the lock after changing dependencies:
  ```bash
  uv lock
  ```
- If an external system insists on a requirements file, export from the lock:
  ```bash
  uv export --frozen --no-dev --format requirements-txt -o requirements.txt
  ```

## Docker

The included `Dockerfile` uses the official uv image and runs the app with Flask-SocketIO on eventlet.

Run:
```bash
docker pull ghcr.io/sudo-kraken/fantasy-dice-chamber:latest
docker run -p 5000:5000 ghcr.io/sudo-kraken/fantasy-dice-chamber:latest
```

## Development container

If you open the repository in a Dev Container, the environment will run `uv sync --extra dev` on create. Inside the container:

```bash
uv run python -m app
uv run pytest
```

The container forwards port 5000 by default.

## Configuration

### GM password

Set the GM password via the `GM_PASSWORD` environment variable. If not set, the default is `Password`.

Examples:

Local with uv:
```bash
export GM_PASSWORD="changeme"
uv run python -m app
```

Docker:
```bash
docker run -p 5000:5000 -e GM_PASSWORD="changeme" ghcr.io/sudo-kraken/fantasy-dice-chamber:latest
```

Docker Compose:
```yaml
services:
  app:
    image: ghcr.io/sudo-kraken/fantasy-dice-chamber:latest
    ports:
      - "5000:5000"
    environment:
      GM_PASSWORD: ${GM_PASSWORD:?set_in_dotenv}
```

Dev Container:
```json
"containerEnv": {
  "GM_PASSWORD": "changeme",
  "HOST": "0.0.0.0",
  "PORT": "5000"
}
```

Kubernetes Secret:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: dice-secrets
type: Opaque
stringData:
  GM_PASSWORD: changeme
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dice
spec:
  template:
    spec:
      containers:
        - name: app
          image: ghcr.io/sudo-kraken/fantasy-dice-chamber:latest
          envFrom:
            - secretRef:
                name: dice-secrets
          ports:
            - containerPort: 5000
```

### Host and port
You can override the host, port, and debug flag via environment variables:
```bash
export HOST=0.0.0.0
export PORT=5000
export FLASK_DEBUG=1
uv run python -m app
```

### Game Presets
- Select your preferred theme (D&D or Warhammer) using the buttons in the header
- Use the preset buttons to quickly make common game rolls

### Character Name
- Enter your character name in the input field
- Your name will be saved for future sessions

### GM Mode
1. Click the "GM Mode" button
2. Enter the GM password (default: `Password`, or your `GM_PASSWORD` value)
3. Use the hidden roll toggle to make rolls that only the GM can see
4. Click the "GM Roll" button to roll selected dice

## Technology Stack

- Backend: Flask, Flask-SocketIO, Python
- Frontend: HTML5, CSS, JavaScript
- Real-time transport: Socket.IO over eventlet
- Packaging and tooling: uv, pytest, pytest-cov, Ruff
- Container: Docker

## Project Structure
```
fantasy-dice-chamber/
├── app.py                  # Flask server and Socket.IO handlers
├── pyproject.toml          # Project metadata and dependencies
├── uv.lock                 # Resolved, pinned dependency lockfile
├── Dockerfile              # Container build using uv
├── tests/
│   └── test_app.py         # Pytest test suite
├── static/
│   ├── css/
│   │   └── styles.css
│   ├── images/
│   │   ├── felt.jpg
│   │   └── parchment.jpg
│   └── js/
│       ├── dice.js
│       └── main.js
├── templates/
│   ├── dice-roller.html
│   └── index.html
└── extras/
    └── preview.gif
```

---

*Fantasy Dice Chamber is not affiliated with Games Workshop, Wizards of the Coast, or any official Warhammer or Dungeons & Dragons product.*

