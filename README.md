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

## Installation

### Prerequisites
- Python 3.10 or higher
- pip (Python package manager)

### Local Setup

1. Clone the repository:
    ```sh
    git clone https://github.com/yourusername/fantasy-dice-chamber.git cd fantasy-dice-chamber
    ```
2. Install dependencies:
    ```sh
    pip install -r requirements.txt
    ```
3. Run the application:
    ```py
    python app.py
    ```
4. Open your browser and navigate to:
    `http://localhost:5000`

### Docker Deployment

1. Build the Docker image:
    ```sh
    podman build -t fantasy-dice-chamber .
    ```
2. Run the container:
    ```sh
    docker run -p 5000:5000 fantasy-dice-chamber
    ```
3. Open your browser and navigate to:
    `http://localhost:5000`

## Usage Guide

### Basic Dice Rolling
- Click on any dice button (d4, d6, d8, etc.) to roll that type of die
- Results appear in the table area and are recorded in the history

### Game Presets
- Select your preferred theme (D&D or Warhammer) using the buttons in the header
- Use the preset buttons to quickly make common game rolls

### Character Name
- Enter your character name in the input field
- Your name will be saved for future sessions

### GM Mode
1. Click the "GM Mode" button
2. Enter the GM password (default: `Password`)
3. Use the hidden roll toggle to make rolls that only the GM can see
4. Click the "GM Roll" button to roll selected dice

## Technology Stack

- **Backend**: Flask, Flask-SocketIO, Python
- **Frontend**: HTML5, CSS3, JavaScript
- **Communication**: Socket.IO for real-time updates
- **Deployment**: Docker

## Project Structure
```
fantasy-dice-chamber/
├── app.py                  # Flask server and Socket.IO handlers
├── requirements.txt        # Python dependencies
├── Dockerfile              # Docker configuration
├── static/                 # Static assets
│   ├── css/
│   │   └── styles.css      # Application styling
│   ├── images/
│   │   ├── felt.jpg        # Dice table background
│   │   └── parchment.jpg   # Page background
│   └── js/
│       ├── dice.js         # Dice animation and handling
│       └── main.js         # Main application logic
└── templates/              # HTML templates
    ├── dice-roller.html    # Main application page
    └── index.html          # Landing page
```
## Configuration

### GM Password
The default GM password is `Password`. To change it, modify the `correct_password` variable in `app.py`.

### Server Port
By default, the application runs on port 5000 in development mode and port 5000 when using Docker. To change the port, modify the `Dockerfile` or the `app.py` file's port configuration.

---

*Fantasy Dice Chamber is not affiliated with Games Workshop, Wizards of the Coast, or any official Warhammer or Dungeons & Dragons product.*

