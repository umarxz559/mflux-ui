import subprocess
import tempfile
import os
import uuid
from pathlib import Path
from typing import Optional


async def run_mflux_command(
    prompt: str,
    base_model: str,
    model: str,
    width: int = 1024,
    height: int = 1024,
    seed: int = 42,
    guidance_scale: float = 7.5,
    num_inference_steps: int = 25,
    compute_precision: str = "float16",
    negative_prompt: Optional[str] = None,
    image_path: Optional[str] = None,
    strength: Optional[float] = None,
) -> str:
    """
    Execute the appropriate mflux CLI command and return the path to the output image.

    Args:
        prompt: Text prompt for image generation.
        base_model: Base model identifier (e.g. 'qwen-image-2.1-turbo').
        model: HuggingFace model name (e.g. 'mflux-community/qwen-image-2-1-turbo-mflux-q8').
        width: Image width.
        height: Image height.
        seed: Random seed.
        guidance_scale: Guidance scale for generation.
        num_inference_steps: Number of inference steps.
        compute_precision: Compute precision (float16, float32, etc.).
        negative_prompt: Optional negative prompt.
        image_path: Optional path to input image for img2img.
        strength: Optional denoising strength for img2img (0.0–1.0).

    Returns:
        Path to the generated output image.

    Raises:
        RuntimeError: If the CLI command fails.
    """
    from commands import (
        get_command_for_base_model,
        supports_img2img,
        supports_cfg,
        MODEL_COMMANDS,
    )

    command_name = get_command_for_base_model(base_model)
    if not command_name:
        raise ValueError(
            f"Unknown base model '{base_model}'. "
            f"Available: {', '.join(MODEL_COMMANDS.keys())}"
        )

    # Build the CLI command
    cmd = [command_name]
    cmd.extend(["--model", model])
    cmd.extend(["--base-model", base_model])
    cmd.extend(["--compute-precision", compute_precision])
    cmd.extend(["--prompt", prompt])
    cmd.extend(["--width", str(width)])
    cmd.extend(["--height", str(height)])
    cmd.extend(["--seed", str(seed)])

    # Only pass --guidance for models that support CFG
    if supports_cfg(base_model):
        cmd.extend(["--guidance", str(guidance_scale)])

    cmd.extend(["--steps", str(num_inference_steps)])

    if negative_prompt:
        cmd.extend(["--negative-prompt", negative_prompt])

    # Image-to-image parameters
    is_img2img = image_path is not None and supports_img2img(base_model)

    if is_img2img:
        # mflux uses --image PATH [STRENGTH] format
        if strength is not None:
            cmd.extend(["--image", image_path, str(strength)])
        else:
            cmd.extend(["--image", image_path])

    # Output to a unique filename — do NOT pre-create the file,
    # because mflux appends _N when the path already exists
    output_path = str(
        Path(tempfile.gettempdir()) / f"mflux-{uuid.uuid4().hex}.png"
    )
    cmd.extend(["--output", output_path])

    # Run the command
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600,  # 10 minute timeout
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError("Generation timed out after 10 minutes")

    if result.returncode != 0:
        stderr = result.stderr.strip()
        raise RuntimeError(f"mflux command failed: {stderr}")

    # mflux may rename the output file (appends _1, _2, etc.)
    # Parse the actual output path from mflux's INFO message
    actual_path = output_path
    for line in (result.stdout + result.stderr).split("\n"):
        if "Image saved successfully at:" in line:
            actual_path = line.split("Image saved successfully at:")[1].strip()
            break

    if not os.path.exists(actual_path):
        raise RuntimeError(
            f"Output file was not created. "
            f"Expected: {actual_path} (original: {output_path})"
        )

    return actual_path
