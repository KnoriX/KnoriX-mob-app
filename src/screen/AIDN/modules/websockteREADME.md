# RealtimeNode — Backend Contract
# FastAPI + WebSocket dual-channel architecture

## Overview

RealtimeNode uses **two channels**:

| Channel | Role |
|---------|------|
| WebSocket (existing) | Live events — tokens, draw commands, chat messages, mode switches |
| FastAPI REST | Heavy operations — chat submit, hint fetch, session analytics |

---

## 1. Payload (from backend → RenderScreen)

```json
{
  "id": "rt_001",
  "type": "realtime",
  "order": 3,
  "layout": "card",
  "payload": {
    "sessionId": "sess_abc123",
    "mode": "mentor_stream",
    "apiBaseUrl": "https://your-api.com",
    "tags": ["thermodynamics", "chapter_4"],

    "mentorConfig": {
      "showThinking": true,
      "allowInterrupt": true,
      "mentorName": "Aryan Sir",
      "mentorAvatarUrl": "https://cdn.yourdomain.com/avatars/aryan.png"
    },

    "whiteboardConfig": {
      "canvasWidth": 400,
      "canvasHeight": 225,
      "background": "#0F0F1A"
    },

    "qaConfig": {
      "studentCanType": true,
      "quickReplies": ["Tell me more", "I don't understand", "Next topic"],
      "inputPlaceholder": "Ask Aryan Sir..."
    }
  }
}
```

---

## 2. WebSocket Events — Backend → Frontend

All events use `{ "event": "<name>", "data": { ... } }` format.

### Mentor Stream Mode

```json
// AI is thinking
{ "event": "rt_thinking", "data": { "active": true } }

// Token arrives
{ "event": "rt_token", "data": { "token": "The ", "flush": false } }
{ "event": "rt_token", "data": { "token": "answer is", "flush": true } }

// Stream complete
{ "event": "rt_stream_done", "data": {} }
```

### Whiteboard Mode

```json
// Begin stroke
{ "event": "rt_wb_cmd", "data": { "cmd": "stroke_start", "x": 10, "y": 20, "color": "#6C63FF", "width": 3 } }

// Add point
{ "event": "rt_wb_cmd", "data": { "cmd": "stroke_point", "x": 15, "y": 30 } }

// End stroke
{ "event": "rt_wb_cmd", "data": { "cmd": "stroke_end" } }

// Text label
{ "event": "rt_wb_cmd", "data": { "cmd": "text", "x": 50, "y": 80, "text": "Pressure ↑", "color": "#E8E8F0", "size": 14 } }

// Shapes
{ "event": "rt_wb_cmd", "data": { "cmd": "shape", "shape": "arrow", "x": 100, "y": 100, "w": 80, "h": 0, "color": "#FF6B6B" } }
{ "event": "rt_wb_cmd", "data": { "cmd": "shape", "shape": "circle", "x": 50, "y": 50, "w": 40, "h": 40, "color": "#6C63FF" } }
{ "event": "rt_wb_cmd", "data": { "cmd": "shape", "shape": "rect", "x": 20, "y": 20, "w": 100, "h": 60, "color": "#4ECDC4" } }

// Highlight region
{ "event": "rt_wb_cmd", "data": { "cmd": "highlight", "x": 30, "y": 50, "w": 200, "h": 30, "color": "#FFE66D" } }

// Clear canvas
{ "event": "rt_wb_cmd", "data": { "cmd": "clear" } }
```

### QA Chat Mode

```json
// AI sends message
{ "event": "rt_qa_msg", "data": { "id": "msg_1", "role": "ai", "text": "Great question! ...", "timestamp": 1718000000000 } }

// AI sends quick reply chips
{ "event": "rt_quick_replies", "data": { "replies": ["Tell me more", "Got it!", "Next topic"] } }
```

### Hybrid Mode

```json
// Switch canvas to a different mode mid-session
{ "event": "rt_switch_mode", "data": { "switchTo": "whiteboard", "transitionMs": 300 } }
```

### Node End

```json
// Signal node is complete — canvas moves to next node
{ "event": "rt_node_done", "data": {} }
```

---

## 3. WebSocket Events — Frontend → Backend

```json
// Student pauses streaming
{ "event": "rt_interrupt", "data": { "sessionId": "sess_abc123" } }

// Student resumes
{ "event": "rt_resume", "data": { "sessionId": "sess_abc123" } }

// Student picks quick reply
{ "event": "rt_quick_reply", "data": { "sessionId": "sess_abc123", "reply": "Tell me more" } }

// Student skips node
{ "event": "rt_node_skip", "data": { "sessionId": "sess_abc123" } }

// Analytics
{ "event": "rt_analytics", "data": { "sessionId": "sess_abc123", "event": "paused", "meta": { "atChar": 320 } } }
```

---

## 4. FastAPI REST Endpoints

### POST /realtime/chat
Heavy chat submit (student typed message).
AI response comes back via WebSocket `rt_qa_msg`.

```json
POST /realtime/chat
{
  "sessionId": "sess_abc123",
  "text": "Can you explain the second law again?"
}

Response: { "status": "ok" }
```

---

## 5. FastAPI Python Example

```python
from fastapi import FastAPI, WebSocket
from pydantic import BaseModel

app = FastAPI()

class ChatRequest(BaseModel):
    sessionId: str
    text: str

@app.post("/realtime/chat")
async def chat_submit(req: ChatRequest):
    # Process student message
    # Push AI response via WebSocket manager → rt_qa_msg
    await ws_manager.push(req.sessionId, {
        "event": "rt_qa_msg",
        "data": {
            "id": generate_id(),
            "role": "ai",
            "text": await ai_respond(req.text),
            "timestamp": now_ms()
        }
    })
    return { "status": "ok" }

@app.websocket("/ws/{session_id}")
async def ws_endpoint(ws: WebSocket, session_id: str):
    await ws_manager.connect(ws, session_id)
    try:
        while True:
            data = await ws.receive_json()
            await handle_client_event(session_id, data)
    except:
        ws_manager.disconnect(session_id)
```

---

## 6. Coordinate System (Whiteboard)

All draw commands use **logical coordinates** (0–400 x, 0–225 y).
Frontend auto-scales to actual screen size.

```
Logical canvas: 400 × 225  (16:9)
Screen card:    (SW - 40) × ((SW-40) × 9/16)
Scale:          scaleX = cardW / 400,  scaleY = cardH / 225
```

Top-left origin (0,0). X → right, Y → down.
