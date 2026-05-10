from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
import sqlite3
import json

DB_NAME = "onative.db"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

connections = []


class Pin(BaseModel):
    lat: float
    lng: float
    username: str = "anonymous"
    text: str
    category: str = "vibe"
    time: str


def get_db():
    return sqlite3.connect(DB_NAME)


def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lat REAL,
        lng REAL,
        username TEXT,
        text TEXT,
        category TEXT,
        time TEXT,
        expires_at TEXT
    )
    """)

    conn.commit()
    conn.close()


init_db()


def get_expiry(category):
    now = datetime.now()

    if category == "traffic":
        return now + timedelta(minutes=30)
    if category == "food":
        return now + timedelta(hours=4)
    if category == "alert":
        return now + timedelta(hours=6)
    if category == "event":
        return now + timedelta(hours=12)

    return now + timedelta(hours=2)


@app.get("/")
def home():
    return {"message": "Onative backend running"}


@app.get("/pins")
def get_pins(north: float, south: float, east: float, west: float):
    now = datetime.now().isoformat()

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM pins WHERE expires_at < ?", (now,))

    cursor.execute("""
        SELECT id, lat, lng, username, text, category, time, expires_at
        FROM pins
        WHERE lat <= ? AND lat >= ? AND lng <= ? AND lng >= ?
        ORDER BY id DESC
    """, (north, south, east, west))

    rows = cursor.fetchall()
    conn.commit()
    conn.close()

    return [
        {
            "id": row[0],
            "lat": row[1],
            "lng": row[2],
            "username": row[3],
            "text": row[4],
            "category": row[5],
            "time": row[6],
            "expires_at": row[7],
        }
        for row in rows
    ]


@app.post("/pins")
async def create_pin(pin: Pin):
    expires_at = get_expiry(pin.category).isoformat()

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO pins (lat, lng, username, text, category, time, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        pin.lat,
        pin.lng,
        pin.username,
        pin.text,
        pin.category,
        pin.time,
        expires_at,
    ))

    conn.commit()
    pin_id = cursor.lastrowid
    conn.close()

    new_pin = {
        "id": pin_id,
        "lat": pin.lat,
        "lng": pin.lng,
        "username": pin.username,
        "text": pin.text,
        "category": pin.category,
        "time": pin.time,
        "expires_at": expires_at,
    }

    for ws in connections[:]:
        try:
            await ws.send_text(json.dumps(new_pin))
        except:
            connections.remove(ws)

    return {"message": "Pin added", "pin": new_pin}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connections.append(websocket)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in connections:
            connections.remove(websocket)
