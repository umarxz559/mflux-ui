"""
mflux UI — FastAPI backend

Serves as a bridge between the React frontend and the mflux CLI.
Endpoints:
  GET  /api/models      — Discover models from `hf cache ls`
  POST /api/generate    — Run mflux CLI and return the image URL
  GET  /api/image/{id}  — Serve a generated image by ID (for download/open)
"""

import base64
import uuid
import shutil
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from models import GenerateRequest, ModelDiscoveryResponse
from cli_runner import run_mflux_command
from streaming import generate_stream
from image_metadata import list_images

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(title="mflux UI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directory for storing generated images (served via /api/image/{id})
IMAGES_DIR = Path(__file__).parent / ".generated_images"
IMAGES_DIR.mkdir(exist_ok=True)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/models", response_model=ModelDiscoveryResponse)
async def discover_models():
    """
    Discover mflux models from the local HuggingFace cache.

    Runs `hf cache ls` and parses its rich JSON output to extract
    all cached image models with their metadata (command, base_model,
    features, defaults, etc.).
    """
    import subprocess
    import json

    cache_models: list[str] = []

    # Try `hf cache ls` first
    for cli in ["hf", "huggingface-cli"]:
        try:
            result = subprocess.run(
                [cli, "cache", "ls", "--json"],
                capture_output=True,
                text=True,
                timeout=30,
            )
            if result.returncode == 0:
                data = json.loads(result.stdout)
                # Parse the models list from the JSON output
                for model in data.get("models", []):
                    repo = model.get("repo", "")
                    # Only include mflux models that are cached and available
                    if repo and "mflux" in repo.lower():
                        cache_models.append(repo)
                if cache_models:
                    break
        except (FileNotFoundError, subprocess.TimeoutExpired, OSError, json.JSONDecodeError):
            continue

    # If cache discovery found nothing, fall back to built-in defaults
    if not cache_models:
        cache_models = [
            "mflux-community/qwen-image-2-1-turbo-mflux-q8",
            "mflux-community/flux-3-image-klein-mflux-q8",
            "mflux-community/z-image-turbo-mflux-q8",
        ]

    return ModelDiscoveryResponse(models=cache_models)


@app.post("/api/generate")
async def generate_image(req: GenerateRequest):
    """
    Generate an image using the mflux CLI.

    If an input image is provided and the model supports img2img,
    runs image-to-image generation. Otherwise runs text-to-image.
    """
    try:
        # Handle uploaded image — write to a file in our images dir
        image_path: str | None = None
        if req.image:
            # Strip data URI prefix if present
            img_data = req.image
            if "," in img_data:
                img_data = img_data.split(",", 1)[1]

            image_path = str(IMAGES_DIR / f"{uuid.uuid4().hex}.jpg")
            with open(image_path, "wb") as f:
                f.write(base64.b64decode(img_data))

        # Run the mflux command
        output_path = await run_mflux_command(
            prompt=req.prompt,
            base_model=req.base_model,
            model=req.model,
            width=req.width,
            height=req.height,
            seed=req.seed,
            guidance_scale=req.guidance_scale,
            num_inference_steps=req.num_inference_steps,
            compute_precision=req.compute_precision,
            negative_prompt=req.negative_prompt,
            image_path=image_path,
            strength=req.strength,
        )

        # Move output to our images directory for serving
        img_id = uuid.uuid4().hex
        final_path = IMAGES_DIR / f"{img_id}.png"
        shutil.move(output_path, final_path)

        # Return the URL to the image
        return {"image": f"/api/image/{img_id}.png"}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")


@app.post("/api/generate-stream")
async def generate_image_stream(req: GenerateRequest):
    """
    Generate an image with real-time progress streaming via SSE.

    Events:
      - progress: { percent, current, total, timing }
      - image_saved: { path }
      - peak_memory: { value, unit }
      - done: { image }
      - error: { message }
    """
    return await generate_stream(req)


@app.get("/api/image/{image_id}")
async def serve_image(image_id: str):
    """Serve a generated image file."""
    image_path = IMAGES_DIR / image_id
    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(image_path, media_type="image/png")


@app.get("/api/images")
async def list_generated_images():
    """
    List all generated images with their metadata.

    Returns list of dicts:
      { image_id, prompt, model, base_model, width, height, seed, steps,
        guidance, generation_time, peak_memory, peak_memory_unit, timestamp }
    Sorted by timestamp descending (newest first).
    """
    images = list_images()
    return {"images": images}


# ---------------------------------------------------------------------------
# Run with: uvicorn main:app --host 127.0.0.1 --port 8010
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8010)
