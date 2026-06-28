# AudioNode — Backend Contract
# FastAPI serves audio · Timestamps drive full canvas

## Architecture

```
Student opens lesson
       │
       ▼
AudioNode → GET /audio/fetch?sessionId=X&lessonId=Y
                │
                ▼
         FastAPI returns:
         { url, durationSeconds, mode, mimeType }
                │
                ▼
         AudioNode streams audio from URL
         + fires timestamp actions locally
         (zero WS cost during playback) ✅
```

WS is NOT used during audio playback.
WS only activates when RealtimeNode is on canvas.

---

## 1. Audio Fetch Endpoint

```
GET /audio/fetch?sessionId={id}&lessonId={id}&studentId={id}
```

**Response:**
```json
{
  "url": "https://cdn.yourdomain.com/lessons/thermo_ch4.mp3",
  "durationSeconds": 187.4,
  "mode": "prerecorded",
  "mimeType": "audio/mpeg"
}
```

For TTS mode — FastAPI generates + caches, then returns URL:
```json
{
  "url": "https://cdn.yourdomain.com/tts/generated_abc123.mp3",
  "durationSeconds": 94.2,
  "mode": "tts",
  "mimeType": "audio/mpeg"
}
```

**FastAPI example:**
```python
@app.get("/audio/fetch")
async def fetch_audio(sessionId: str, lessonId: str, studentId: str):
    lesson = await db.get_lesson(lessonId)
    
    if lesson.audioMode == "tts":
        # Generate or return cached TTS
        url = await tts_service.get_or_generate(lesson.script, lessonId)
    else:
        url = lesson.audioUrl  # CDN URL
    
    return {
        "url": url,
        "durationSeconds": lesson.audioDuration,
        "mode": lesson.audioMode,
        "mimeType": "audio/mpeg"
    }
```

---

## 2. Full Node Payload

```json
{
  "id": "audio_001",
  "type": "audio",
  "order": 0,
  "layout": "card",
  "payload": {
    "sessionId": "sess_abc123",
    "audioFetchUrl": "https://your-api.com/audio/fetch?sessionId=sess_abc123&lessonId=thermo_4",
    "apiBaseUrl": "https://your-api.com",
    "showWaveform": true,
    "showCaptions": true,
    "autoPlay": true,
    "tags": ["thermodynamics", "chapter_4"],

    "chapters": [
      { "at": 0,    "title": "Introduction" },
      { "at": 45.0, "title": "Boyle's Law" },
      { "at": 98.5, "title": "Charles's Law" },
      { "at": 142.0,"title": "Summary" }
    ],

    "timestamps": [
      { "at": 2.5,  "action": "show_caption",    "text": "Welcome to Thermodynamics Chapter 4" },
      { "at": 5.0,  "action": "hide_caption" },

      { "at": 8.0,  "action": "show_node",        "nodeId": "n1", "nodeType": "markdown",
                    "payload": { "content": "## Boyle's Law\n\nPV = k" } },

      { "at": 12.0, "action": "highlight_node",   "nodeId": "n1", "color": "#6C63FF", "durationMs": 1500 },

      { "at": 20.0, "action": "skia_cmd",
                    "targetNodeId": "skia_01",
                    "cmd": { "cmd": "stroke_start", "x": 50, "y": 100, "color": "#FF6B6B", "width": 3 } },

      { "at": 20.1, "action": "skia_cmd",
                    "targetNodeId": "skia_01",
                    "cmd": { "cmd": "stroke_point", "x": 200, "y": 50 } },

      { "at": 20.2, "action": "skia_cmd",
                    "targetNodeId": "skia_01",
                    "cmd": { "cmd": "stroke_end" } },

      { "at": 35.0, "action": "show_caption",     "text": "Notice how pressure increases as volume decreases" },

      { "at": 45.0, "action": "chapter_marker",   "title": "Boyle's Law" },

      { "at": 60.0, "action": "trigger_mcq",
                    "pauseAudio": true,
                    "mcqPayload": {
                      "mode": "single",
                      "question": "If volume halves, pressure...",
                      "options": [
                        { "id": "a", "text": "Doubles" },
                        { "id": "b", "text": "Halves" },
                        { "id": "c", "text": "Stays same" }
                      ],
                      "correctIds": ["a"]
                    }
      },

      { "at": 98.5, "action": "chapter_marker",   "title": "Charles's Law" },

      { "at": 100.0,"action": "remove_node",       "nodeId": "n1" },
      { "at": 100.5,"action": "show_node",         "nodeId": "n2", "nodeType": "markdown",
                    "payload": { "content": "## Charles's Law\n\nV/T = k" } },

      { "at": 142.0,"action": "chapter_marker",   "title": "Summary" },
      { "at": 145.0,"action": "audio_pause",       "resumeAfterMs": 1500 },
      { "at": 185.0,"action": "show_caption",      "text": "Great work! Chapter complete 🎉" }
    ]
  }
}
```

---

## 3. Canvas Dispatcher (renderScreen.tsx integration)

AudioNode needs a `dispatcher` prop — wire it in renderScreen:

```tsx
// renderScreen.tsx
const dispatcher: CanvasEventDispatcher = {
  showNode: (nodeId, nodeType, payload) => {
    addNode({ id: nodeId, type: nodeType, payload });
  },
  removeNode: (nodeId) => {
    removeNode(nodeId);
  },
  highlightNode: (nodeId, color, durationMs) => {
    // Set highlight state on node → NodeCell shows glow
    setNodeHighlight(nodeId, color, durationMs);
  },
  scrollToNode: (nodeId) => {
    canvasScrollRef.current?.scrollTo({ y: nodeYPositions[nodeId] });
  },
  skiaCmd: (targetNodeId, cmd) => {
    // Push command to specific SkiaNode's command queue
    dispatchSkiaCmd(targetNodeId, cmd);
  },
  skiaClear: (targetNodeId) => {
    dispatchSkiaCmd(targetNodeId, { cmd: 'clear' });
  },
  triggerMCQ: (mcqPayload) => {
    // Inject MCQ node at top of canvas
    addNode({ id: 'audio_mcq', type: 'mcq', payload: mcqPayload });
  },
};

// Pass to AudioNode:
<AudioNode payload={node.payload} onDone={onDone} dispatcher={dispatcher} />
```

---

## 4. Cost Analysis

| Approach | WS messages during 3min lesson |
|----------|-------------------------------|
| All via WebSocket | ~1800 msgs (30/sec) ❌ |
| AudioNode approach | 0 msgs ✅ |

Timestamps are pre-computed by backend, bundled in initial payload.
Zero realtime cost during playback.
WS only used when student interacts (MCQ answer, skip).

---

## 5. Install

```bash
npx expo install expo-av
```
