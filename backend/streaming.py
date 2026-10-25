"""
Streaming generation endpoint — streams mflux CLI progress via SSE.

Uses a simpler approach: reads directly from subprocess pipes.
"""

import asyncio
import base64
import json
import re
import shutil
import tempfile
import uuid
from pathlib import Path

from fastapi import HTTPException
from fastapi.responses import StreamingResponse

from models import GenerateRequest
from commands import supports_img2img, supports_cfg, MODEL_COMMANDS, get_command_for_base_model
from image_metadata import save_metadata

# Directory for storing generated images
IMAGES_DIR = Path(__file__).parent / ".generated_images"
IMAGES_DIR.mkdir(exist_ok=True)


def parse_progress_line(line: str) -> dict | None:
    """Parse a mflux progress bar line into structured data."""
    pattern = r"(\d+)%\s*\|[^|]*\|\s*(\d+)/(\d+)\s*\[([^\]]+)\]"
    match = re.search(pattern, line)
    if match:
        return {
            "type": "progress",
            "percent": int(match.group(1)),
            "current": int(match.group(2)),
            "total": int(match.group(3)),
            "timing": match.group(4),
        }
    return None


def parse_info_line(line: str) -> dict | None:
    """Parse mflux INFO lines for final status."""
    if "Image saved successfully at:" in line:
        path = line.split("Image saved successfully at:")[1].strip()
        return {"type": "image_saved", "path": path}
    if "Metadata embedded successfully" in line:
        return {"type": "metadata_embedded"}
    if "Peak MLX memory:" in line:
        match = re.search(r"Peak MLX memory:\s*([\d.]+)\s*(GB|MB)", line)
        if match:
            return {
                "type": "peak_memory",
                "value": float(match.group(1)),
                "unit": match.group(2),
            }
    return None


def process_line(line: str):
    """Process a single line and return SSE event or None."""
    progress = parse_progress_line(line)
    if progress:
        return f"data: {json.dumps(progress)}\n\n"

    info = parse_info_line(line)
    if info:
        return f"data: {json.dumps(info)}\n\n"

    return f"data: {json.dumps({'type': 'raw', 'text': line})}\n\n"


async def event_generator(req: GenerateRequest):
    """Main generator that orchestrates streaming."""
    command_name = get_command_for_base_model(req.base_model)
    if not command_name:
        yield f"data: {json.dumps({'type': 'error', 'message': f'Unknown base model: {req.base_model}'})}\n\n"
        return

    # Build CLI command
    cmd = [command_name]
    cmd.extend(["--model", req.model])
    cmd.extend(["--base-model", req.base_model])
    cmd.extend(["--compute-precision", req.compute_precision])
    cmd.extend(["--prompt", req.prompt])
    cmd.extend(["--width", str(req.width)])
    cmd.extend(["--height", str(req.height)])
    cmd.extend(["--seed", str(req.seed)])

    if supports_cfg(req.base_model):
        cmd.extend(["--guidance", str(req.guidance_scale)])

    cmd.extend(["--steps", str(req.num_inference_steps)])

    if req.negative_prompt:
        cmd.extend(["--negative-prompt", req.negative_prompt])

    # Handle image-to-image
    image_path: str | None = None
    if req.image:
        img_data = req.image
        if "," in img_data:
            img_data = img_data.split(",", 1)[1]
        image_path = str(IMAGES_DIR / f"{uuid.uuid4().hex}.jpg")
        with open(image_path, "wb") as f:
            f.write(base64.b64decode(img_data))

    if image_path is not None and supports_img2img(req.base_model):
        if req.strength is not None:
            cmd.extend(["--image", image_path, str(req.strength)])
        else:
            cmd.extend(["--image", image_path])

    # Output path
    output_path = str(Path(tempfile.gettempdir()) / f"mflux-{uuid.uuid4().hex}.png")
    cmd.extend(["--output", output_path])

    # Track peak memory from SSE events
    peak_memory_value = None
    peak_memory_unit = None
    start_time = asyncio.get_event_loop().time()

    # Launch subprocess
    process = None
    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        actual_path = output_path

        # Read from both pipes concurrently
        async def read_pipe(pipe, prefix=""):
            """Read all data from a pipe and yield processed lines."""
            while True:
                chunk = await pipe.read(4096)
                if not chunk:
                    break
                text = chunk.decode("utf-8", errors="replace")
                # Split on \n and \r
                for segment in re.split(r'[\r\n]+', text):
                    line = segment.strip()
                    if line:
                        event = process_line(line)
                        if event:
                            yield event

        # Use a queue to merge outputs from both pipes
        merged_queue: asyncio.Queue = asyncio.Queue()

        async def reader_wrapper(pipe, name):
            """Read from a pipe and put events on merged queue."""
            try:
                async for event in read_pipe(pipe, name):
                    await merged_queue.put(event)
            except Exception:
                pass
            finally:
                await merged_queue.put(None)  # EOF sentinel

        # Start readers
        asyncio.create_task(reader_wrapper(process.stdout, "stdout"))
        asyncio.create_task(reader_wrapper(process.stderr, "stderr"))

        # Process merged events
        eof_count = 0
        while eof_count < 2:
            event = await merged_queue.get()
            if event is None:
                eof_count += 1
                continue
            # Capture peak_memory value for metadata
            try:
                event_json = event.split("data: ", 1)[1]
                evt_data = json.loads(event_json)
                if evt_data.get("type") == "peak_memory":
                    peak_memory_value = evt_data.get("value")
                    peak_memory_unit = evt_data.get("unit", "GB")
            except Exception:
                pass
            yield event

        # Wait for process
        await process.wait()

        if process.returncode != 0:
            yield f"data: {json.dumps({'type': 'error', 'message': f'Generation failed (exit code {process.returncode})'})}\n\n"
            return

        if not Path(actual_path).exists():
            yield f"data: {json.dumps({'type': 'error', 'message': f'Output file not found: {actual_path}'})}\n\n"
            return

        # Move to images directory
        img_id = uuid.uuid4().hex
        final_path = IMAGES_DIR / f"{img_id}.png"
        shutil.move(actual_path, final_path)

        # Save generation metadata
        elapsed = asyncio.get_event_loop().time() - start_time
        save_metadata(img_id, {
            "prompt": req.prompt,
            "negative_prompt": req.negative_prompt,
            "model": req.model,
            "base_model": req.base_model,
            "width": req.width,
            "height": req.height,
            "seed": req.seed,
            "steps": req.num_inference_steps,
            "guidance": req.guidance_scale,
            "generation_time": round(elapsed, 2),
            "peak_memory": peak_memory_value,
            "peak_memory_unit": peak_memory_unit,
        })

        yield f"data: {json.dumps({'type': 'done', 'image': f'/api/image/{img_id}.png'})}\n\n"

    except asyncio.TimeoutError:
        yield f"data: {json.dumps({'type': 'error', 'message': 'Generation timed out after 10 minutes'})}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    finally:
        if process and process.returncode is None:
            process.terminate()
            try:
                await asyncio.wait_for(process.wait(), timeout=5)
            except (asyncio.TimeoutError, ProcessLookupError):
                process.kill()


async def generate_stream(req: GenerateRequest):
    """FastAPI endpoint for streaming image generation."""
    return StreamingResponse(
        event_generator(req),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
