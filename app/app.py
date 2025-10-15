import os
import random
import sys
from datetime import datetime

from flask import Flask, jsonify, render_template, request
from flask_socketio import SocketIO, emit, join_room

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "secret!")

# GM password from environment, defaults to "Password" for local dev and tests
GM_PASSWORD = os.environ.get("GM_PASSWORD", "Password")

socketio = SocketIO(app, async_mode="eventlet")

try:
    pkg = sys.modules.get("app")
    if pkg is not None:
        pkg.random = random
except Exception:
    pass

# Define roll history storage
roll_history = []  # Regular roll history
gm_roll_history = []  # GM-only roll history
MAX_HISTORY = 50  # Maximum history size


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/dice-roller")
def dice_roller():
    return render_template("dice-roller.html")


@app.route("/gm-verify", methods=["POST"])
def gm_verify():
    data = request.json or {}
    password = data.get("password", "")
    if password == GM_PASSWORD:
        return jsonify({"success": True})
    return jsonify({"success": False})


@app.route("/health")
def health():
    """Simple health endpoint used by the Docker HEALTHCHECK and monitoring.

    Returns JSON {"ok": True} with HTTP 200 when the app is up.
    """
    return jsonify({"ok": True}), 200


@socketio.on("connect")
def handle_connect():
    pass


@socketio.on("join_gm_room")
def handle_join_gm_room():
    join_room("gm_room")
    emit("gm_status", {"status": "connected"})


@socketio.on("roll_dice")
def handle_roll_dice(data):
    data = data or {}
    dice_type = data.get("dice_type", "d6")
    character = data.get("character", "Anonymous")
    roll_type = data.get("roll_type")
    theme = data.get("theme", "dnd")
    roll_id = data.get("roll_id")
    is_gm_roll = data.get("is_gm_roll", False)
    is_hidden = data.get("is_hidden", False)

    try:
        if dice_type == "d100":
            tens_die = random.randint(0, 9)
            ones_die = random.randint(0, 9)
            result = 100 if tens_die == 0 and ones_die == 0 else tens_die * 10 + ones_die
            print(f"D100 roll: tens={tens_die}, ones={ones_die}, result={result}")
            message = {
                "dice_type": dice_type,
                "result": result,
                "character": character,
                "roll_type": roll_type,
                "theme": theme,
                "timestamp": datetime.now().isoformat(),
                "roll_id": roll_id,
                "tens_die": tens_die,
                "ones_die": ones_die,
                "is_gm_roll": is_gm_roll,
                "is_hidden": is_hidden,
            }
        else:
            sides = int(dice_type[1:])
            result = random.randint(1, sides)
            print(f"{dice_type} roll: result={result}")
            message = {
                "dice_type": dice_type,
                "result": result,
                "character": character,
                "roll_type": roll_type,
                "theme": theme,
                "timestamp": datetime.now().isoformat(),
                "roll_id": roll_id,
                "is_gm_roll": is_gm_roll,
                "is_hidden": is_hidden,
            }
    except Exception as e:
        print(f"Error processing dice roll: {e}")
        result = random.randint(1, 6)
        message = {
            "dice_type": "d6",
            "result": result,
            "character": character,
            "timestamp": datetime.now().isoformat(),
            "roll_id": roll_id,
        }

    if is_gm_roll:
        gm_roll_history.append(message)
        if len(gm_roll_history) > MAX_HISTORY:
            gm_roll_history.pop(0)
    else:
        roll_history.append(message)
        if len(roll_history) > MAX_HISTORY:
            roll_history.pop(0)

    if is_gm_roll:
        if is_hidden:
            emit("dice_result", message, room="gm_room")
        else:
            emit("dice_result", message, broadcast=True)
    else:
        emit("dice_result", message, broadcast=True)


@socketio.on("request_history")
def handle_history_request(data=None):
    is_gm = bool(data and data.get("is_gm"))
    if is_gm:
        all_history = roll_history + gm_roll_history
        emit("roll_history", all_history)
    else:
        emit("roll_history", roll_history)


@socketio.on("clear_history")
def handle_clear_history(data=None):
    global roll_history, gm_roll_history
    is_gm = bool(data and data.get("is_gm"))
    if is_gm:
        roll_history = []
        gm_roll_history = []
    else:
        roll_history = []
    emit("roll_history", [], broadcast=True)


if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "5000"))
    debug_flag = os.environ.get("FLASK_DEBUG", "").lower() in ("1", "true", "yes")
    socketio.run(app, host=host, port=port, debug=debug_flag)
