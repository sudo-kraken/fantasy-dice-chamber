import pytest
from flask import json

from app.app import app, socketio


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


@pytest.fixture(autouse=True)
def clear_histories():
    # Ensure per-test isolation of in-memory histories
    from app.app import gm_roll_history, roll_history

    roll_history.clear()
    gm_roll_history.clear()
    yield
    roll_history.clear()
    gm_roll_history.clear()


def test_index_route(client):
    resp = client.get("/")
    assert resp.status_code == 200
    # if templates exist, we expect html in the response
    assert b"<html" in resp.data or b"<!doctype html" in resp.data.lower()


def test_health_endpoint(client):
    """Health endpoint should return a small JSON payload indicating liveness."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = json.loads(resp.data)
    assert data.get("ok") is True


def test_dice_roller_route(client):
    resp = client.get("/dice-roller")
    assert resp.status_code == 200
    assert b"<html" in resp.data or b"<!doctype html" in resp.data.lower()


def test_gm_verify_success(client):
    resp = client.post("/gm-verify", json={"password": "Password"})
    assert resp.status_code == 200
    data = json.loads(resp.data)
    assert data["success"] is True


def test_gm_verify_failure(client):
    resp = client.post("/gm-verify", json={"password": "wrong"})
    assert resp.status_code == 200
    data = json.loads(resp.data)
    assert data["success"] is False


def test_socketio_roll_d6_basic():
    test_client = socketio.test_client(app)
    test_client.emit("roll_dice", {"dice_type": "d6", "character": "Tester"})
    received = test_client.get_received()
    # Should get a dice_result back
    dice_events = [x for x in received if x["name"] == "dice_result"]
    assert dice_events, f"no dice_result in {received}"
    payload = dice_events[-1]["args"][0]
    assert payload["dice_type"] == "d6"
    assert 1 <= payload["result"] <= 6
    assert payload["character"] == "Tester"


def test_socketio_roll_d100_shows_100_when_00(monkeypatch):
    # Force tens=0 and ones=0 so result should be 100
    seq = iter([0, 0])

    def fake_randint(_a, _b):
        return next(seq)

    # Patch the randint used inside the app module
    monkeypatch.setattr("app.random.randint", fake_randint)

    test_client = socketio.test_client(app)
    test_client.emit("roll_dice", {"dice_type": "d100", "character": "Tester"})
    received = test_client.get_received()
    dice_events = [x for x in received if x["name"] == "dice_result"]
    assert dice_events, f"no dice_result in {received}"
    payload = dice_events[-1]["args"][0]
    assert payload["dice_type"] == "d100"
    assert payload["result"] == 100
    assert payload["tens_die"] == 0
    assert payload["ones_die"] == 0


def test_socketio_roll_invalid_dice_falls_back_to_d6(monkeypatch):
    # Make any randint call deterministic
    monkeypatch.setattr("app.random.randint", lambda a, b: 3)
    test_client = socketio.test_client(app)
    test_client.emit("roll_dice", {"dice_type": "not_a_die"})
    received = test_client.get_received()
    dice_events = [x for x in received if x["name"] == "dice_result"]
    assert dice_events
    payload = dice_events[-1]["args"][0]
    # Error path in handler falls back to d6
    assert payload["dice_type"] == "d6"
    assert 1 <= payload["result"] <= 6


def test_socketio_request_history_public_only():
    c = socketio.test_client(app)
    # Make two public rolls
    c.emit("roll_dice", {"dice_type": "d6", "character": "One"})
    c.emit("roll_dice", {"dice_type": "d8", "character": "Two"})
    # Flush dice_result notifications
    _ = c.get_received()

    # Request public history
    c.emit("request_history", {"is_gm": False})
    received = c.get_received()
    history_events = [x for x in received if x["name"] == "roll_history"]
    assert history_events
    history = history_events[-1]["args"][0]
    assert isinstance(history, list)
    assert len(history) == 2
    # Ensure no GM-only rolls are present
    assert all(not item.get("is_gm_roll") for item in history)


def test_socketio_request_history_includes_gm_when_is_gm_true():
    public_client = socketio.test_client(app)
    gm_client = socketio.test_client(app)

    # GM joins the GM room
    gm_client.emit("join_gm_room")
    gm_received = gm_client.get_received()
    assert any(x["name"] == "gm_status" for x in gm_received)

    # Create one public roll and one GM-only hidden roll
    public_client.emit("roll_dice", {"dice_type": "d6"})
    public_client.get_received()  # drain
    public_client.emit("roll_dice", {"dice_type": "d6", "is_gm_roll": True, "is_hidden": True})
    public_client.get_received()  # the sender should not see hidden GM roll

    # As GM, request full history
    gm_client.emit("request_history", {"is_gm": True})
    gm_received = gm_client.get_received()
    history_events = [x for x in gm_received if x["name"] == "roll_history"]
    assert history_events
    history = history_events[-1]["args"][0]
    # Should include both public and GM rolls
    assert len(history) == 2
    assert any(item.get("is_gm_roll") for item in history)


def test_socketio_clear_history_public_only():
    c = socketio.test_client(app)
    c.emit("roll_dice", {"dice_type": "d6"})
    c.get_received()
    c.emit("clear_history", {"is_gm": False})
    received = c.get_received()
    # Should broadcast empty history
    history_events = [x for x in received if x["name"] == "roll_history"]
    assert history_events
    history = history_events[-1]["args"][0]
    assert history == []


def test_socketio_clear_history_gm_clears_everything():
    public_client = socketio.test_client(app)
    gm_client = socketio.test_client(app)

    # Seed both histories
    public_client.emit("roll_dice", {"dice_type": "d6"})
    public_client.emit("roll_dice", {"dice_type": "d8", "is_gm_roll": True})
    public_client.get_received()

    # GM clears all histories
    gm_client.emit("clear_history", {"is_gm": True})
    # Everyone should see empty history
    gm_received = gm_client.get_received()
    history_events = [x for x in gm_received if x["name"] == "roll_history"]
    assert history_events
    assert history_events[-1]["args"][0] == []

    public_received = public_client.get_received()
    public_history_events = [x for x in public_received if x["name"] == "roll_history"]
    assert public_history_events
    assert public_history_events[-1]["args"][0] == []


def test_socketio_join_gm_room_sends_status():
    test_client = socketio.test_client(app)
    test_client.emit("join_gm_room")
    received = test_client.get_received()
    found = any(x["name"] == "gm_status" for x in received)
    assert found
