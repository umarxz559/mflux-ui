# mflux UI

A web-based image generation interface for [mflux](https://github.com/mflux-community/mflux).

## Features

- **Auto-discovered models** — scans your HF cache via `hf cache ls --json`
- **Real-time streaming progress** — percentage, steps, timing, and peak memory via SSE
- **Text-to-image & Image-to-image** — img2img supported on compatible models
- **Model-specific defaults** — inference steps and guidance auto-set per model
- **Persistent settings** — all preferences saved to localStorage
- **16 size presets** — covering 1:1, 3:4, 4:3, 9:16, 16:9, 21:9, 3:2, and 4:5 ratios
- **Dark theme** — clean, minimal UI with no heavy dependencies

## Tech Stack

- **Frontend:** React 18 + Vite 5 + plain CSS (no UI library)
- **Backend:** FastAPI (Python) + Uvicorn
- **Communication:** REST API + Server-Sent Events (SSE) for streaming progress

## Project Structure

```
mflux-ui/
├── backend/
│   ├── main.py           # FastAPI app — routes, CORS, image serving
│   ├── streaming.py      # SSE streaming endpoint for progress
│   ├── cli_runner.py     # Non-streaming generation
│   ├── commands.py       # Model-to-CLI command registry
│   ├── models.py         # Pydantic request/response schemas
│   └── lib/              # Installed Python packages (fastapi, uvicorn, etc.)
├── frontend/
│   ├── index.html        # HTML entry point
│   ├── vite.config.js    # Vite config with API proxy
│   ├── package.json
│   └── src/
│       ├── main.jsx              # React entry
│       ├── App.jsx               # Root component (SSE, settings)
│       ├── App.css               # All styles
│       ├── index.css             # Global resets
│       ├── constants.js          # Models, sizes, defaults
│       └── components/
│           ├── ModelSelector.jsx
│           ├── SizeSelector.jsx
│           ├── PromptInput.jsx
│           ├── ImageUpload.jsx
│           ├── AdvancedSettings.jsx
│           └── OutputPanel.jsx
├── start.sh              # One-command launcher (backend + frontend)
├── .gitignore
└── README.md
```

## Quick Start

### Prerequisites

- **Python 3.10+** with `uv` installed
- **Node.js 18+** and **npm**
- **mflux** installed via `uv tool install --upgrade mflux`
- **Hugging Face CLI** (`hf` or `huggingface-cli`) for model discovery

### 1. Clone & Start

```bash
git clone https://github.com/umarxz559/mflux-ui.git
cd mflux-ui
./start.sh
```

This launches:
- **Backend** on `http://127.0.0.1:8010` (FastAPI + Uvicorn)
- **Frontend** on `http://127.0.0.1:3000` (Vite dev server, hot-reload)

### 2. Open the App

Visit **http://127.0.0.1:3000** in your browser.

### Manual Start (separate terminals)

**Backend:**
```bash
cd backend
python3 -m uvicorn main:app --host 127.0.0.1 --port 8010 --reload
```

**Frontend:**
```bash
cd frontend
npm install    # first time only
npm run dev
```

## Usage

### Model Selection

Models are auto-discovered from your local HF cache. The dropdown shows discovered models with their display names. Models supporting img2img are marked with a badge.

### Image Generation

1. Select a model
2. Choose a size preset or enter custom dimensions
3. Enter a prompt (negative prompt is optional)
4. Adjust advanced settings (seed, guidance, steps, precision)
5. Click **Generate**

For **image-to-image**, upload a reference image (only available on qwen-image-2.1-turbo). Adjust the strength slider to control how much the reference influences the result.

### Progress Streaming

During generation, a progress bar shows the percentage. Below it, detailed stats appear:

- **Step** — current step / total steps
- **Elapsed** — time elapsed and ETA (e.g. `00:03<00:02, 1.44it/s`)
- **Peak Memory** — peak MLX memory usage (e.g. `7.55 GB`)

The progress bar hides when generation completes.

### Settings

All settings (model, size, prompt, seed, steps, etc.) persist in `localStorage`. On model change, inference steps and guidance scale reset to the model's defaults.

## Adding New Models

### 1. Backend — `backend/commands.py`

Add an entry to `MODEL_COMMANDS`:

```python
MODEL_COMMANDS = {
    # ... existing models ...
    "new-model-sft": {
        "command": "mflux-generate-new-model",
        "supports_img2img": False,
        "supports_cfg": True,
        "default_steps": 20,
        "default_guidance": 7.5,
    },
}
```

### 2. Frontend — `frontend/src/constants.js`

Add to `DEFAULT_MODELS`:
```javascript
'mflux-community/new-model-sft-mflux-q8',
```

Add to `MODEL_INFO`:
```javascript
'mflux-community/new-model-sft-mflux-q8': {
  displayName: 'New Model',
  baseModel: 'new-model-sft',
  supportsImg2Img: false,
  defaultSteps: 20,
  defaultGuidance: 7.5,
},
```

That's it! The model appears in the dropdown after a page refresh (or auto-discovery via `hf cache ls`).

## Image Presets

| Preset | Dimensions | Use Case |
|--------|-----------|----------|
| 1:1 | 1024×1024 | Default, social posts |
| 3:4 | 768×1024 | Portrait, Pinterest |
| 4:3 | 1024×768 | Classic photo |
| 9:16 | 720×1280 | Mobile stories, Reels |
| 16:9 | 1280×720 | Wide, presentations |
| 21:9 | 1680×720 | Ultrawide, cinemascopic |
| 3:2 | 1536×1024 | Photography standard |
| 4:5 | 1080×1350 | Instagram portrait |

Custom dimensions available (step: 64px).

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/models` | Discover models from HF cache |
| POST | `/api/generate-stream` | Stream image generation with progress (SSE) |
| GET | `/api/image/{id}` | Serve a generated image |

### POST /api/generate-stream Request Body

```json
{
  "model": "mflux-community/qwen-image-2-1-turbo-mflux-q8",
  "baseModel": "qwen-image-2.1-turbo",
  "prompt": "A photorealistic red fox in a misty forest",
  "negativePrompt": "blurry, low quality",
  "width": 1024,
  "height": 1024,
  "seed": 42,
  "guidanceScale": 7.5,
  "numInferenceSteps": 25,
  "computePrecision": "float16",
  "image": "data:image/jpeg;base64,...",  // optional, for img2img
  "strength": 0.5                         // optional, for img2img
}
```

### SSE Events

| Type | Fields |
|------|--------|
| `progress` | `percent`, `current`, `total`, `timing` |
| `raw` | `text` |
| `image_saved` | `path` |
| `metadata_embedded` | — |
| `peak_memory` | `value`, `unit` |
| `done` | `image` |
| `error` | `message` |

### Response (done event)

```json
{ "type": "done", "image": "/api/image/abc123.png" }
```

## License

MIT
