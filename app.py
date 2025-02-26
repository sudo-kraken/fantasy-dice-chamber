from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit, join_room
import random
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

# Define roll history storage
roll_history = []  # Regular roll history
gm_roll_history = []  # GM-only roll history
MAX_HISTORY = 50  # Maximum history size

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dice-roller')
def dice_roller():
    return render_template('dice-roller.html')

@app.route('/gm-verify', methods=['POST'])
def gm_verify():
    data = request.json
    password = data.get('password', '')
    
    # Set the correct password
    correct_password = "Password"
    
    if password == correct_password:
        return jsonify({"success": True})
    else:
        return jsonify({"success": False})

@socketio.on("connect")
def handle_connect():
    pass

@socketio.on("join_gm_room")
def handle_join_gm_room():
    join_room('gm_room')
    emit("gm_status", {"status": "connected"})

@socketio.on("roll_dice")
def handle_roll_dice(data):
    dice_type = data.get("dice_type", "d6")
    character = data.get("character", "Anonymous")
    roll_type = data.get("roll_type")
    theme = data.get("theme", "dnd")
    roll_id = data.get("roll_id")
    is_gm_roll = data.get("is_gm_roll", False)
    is_hidden = data.get("is_hidden", False)
    
    try:
        # Calculate result based on dice type
        if dice_type == 'd100':
            # Special handling for d100
            tens_die = random.randint(0, 9)
            ones_die = random.randint(0, 9)
            
            # Calculate result (00 = 100)
            if tens_die == 0 and ones_die == 0:
                result = 100
            else:
                result = tens_die * 10 + ones_die
            
            # Log what we're sending to help debug
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
                "is_hidden": is_hidden
            }
        else:
            # Extract sides from dice type (e.g., d6 -> 6)
            sides = int(dice_type[1:])
            
            # Single die roll
            result = random.randint(1, sides)
            
            # Log what we're sending to help debug
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
                "is_hidden": is_hidden
            }
    except Exception as e:
        print(f"Error processing dice roll: {e}")
        # Default to d6 if there's an error
        result = random.randint(1, 6)
        message = {
            "dice_type": "d6",
            "result": result,
            "character": character,
            "timestamp": datetime.now().isoformat(),
            "roll_id": roll_id
        }
    
    # Store in history
    if is_gm_roll:
        gm_roll_history.append(message)
        if len(gm_roll_history) > MAX_HISTORY:
            gm_roll_history.pop(0)
    else:
        roll_history.append(message)
        if len(roll_history) > MAX_HISTORY:
            roll_history.pop(0)
    
    # Broadcast appropriately based on hidden status
    if is_gm_roll:
        if is_hidden:  # Default to hidden for backward compatibility
            # Only emit to GM users
            emit('dice_result', message, room='gm_room')
        else:
            # Broadcast to everyone
            emit('dice_result', message, broadcast=True)
    else:
        # Regular rolls
        emit('dice_result', message, broadcast=True)

@socketio.on('request_history')
def handle_history_request(data=None):
    is_gm = False
    if data and 'is_gm' in data:
        is_gm = data['is_gm']
    
    # Send appropriate history based on GM status
    if is_gm:
        # Send all history including GM rolls
        all_history = roll_history + gm_roll_history
        emit('roll_history', all_history)
    else:
        # Send only public history
        emit('roll_history', roll_history)

@socketio.on("clear_history")
def handle_clear_history(data=None):
    global roll_history, gm_roll_history
    
    is_gm = data and data.get('is_gm', False)
    
    if is_gm:
        roll_history = []
        gm_roll_history = []
    else:
        roll_history = []
    
    emit("roll_history", [], broadcast=True)

if __name__ == '__main__':
    socketio.run(app, debug=True)