"""
mflux CLI command registry.

Each entry maps a base model name to its CLI command.
Add new models here when they become available.

To add a new model:
  1. Add an entry to MODEL_COMMANDS below
  2. (Optional) Add to frontend/src/constants.js MODELS array

The models are auto-discovered from `hf cache ls --json` at runtime,
so adding here ensures the CLI command is known even if the cache
scan is unavailable.
"""

MODEL_COMMANDS: dict[str, dict] = {
    # ── Qwen Image family ──────────────────────────────────────────
    "qwen-image-2.1-turbo": {
        "command": "mflux-generate-qwen-2.1",
        "supports_img2img": True,
        "supports_cfg": False,  # Runs without CFG
        "default_steps": 8,
        "default_guidance": 1.0,
    },
    "qwen-image-2.1": {
        "command": "mflux-generate-qwen-2.1",
        "supports_img2img": True,
        "supports_cfg": False,
        "default_steps": 8,
        "default_guidance": 1.0,
    },
    "qwen-image": {
        "command": "mflux-generate-qwen",
        "supports_img2img": True,
        "supports_cfg": False,
        "default_steps": 8,
        "default_guidance": 1.0,
    },
    "qwen-image-edit": {
        "command": "mflux-generate-qwen-edit",
        "supports_img2img": True,
        "supports_cfg": True,
        "default_steps": 8,
        "default_guidance": 3.5,
    },
    "qwen-image-edit-2511": {
        "command": "mflux-generate-qwen-edit",
        "supports_img2img": True,
        "supports_cfg": True,
        "default_steps": 8,
        "default_guidance": 3.5,
    },

    # ── FLUX family ────────────────────────────────────────────────
    "flux3-image-klein": {
        "command": "mflux-generate-flux3",
        "supports_img2img": False,
        "supports_cfg": True,
        "default_steps": 16,
        "default_guidance": 3.5,
    },
    "flux3-image-klein-4b": {
        "command": "mflux-generate-flux3",
        "supports_img2img": False,
        "supports_cfg": True,
        "default_steps": 16,
        "default_guidance": 3.5,
    },
    "flux2-klein-4b": {
        "command": "mflux-generate-flux2",
        "supports_img2img": False,
        "supports_cfg": True,
        "default_steps": 16,
        "default_guidance": 3.5,
    },
    "flux2-klein": {
        "command": "mflux-generate-flux2",
        "supports_img2img": False,
        "supports_cfg": True,
        "default_steps": 16,
        "default_guidance": 3.5,
    },
    "flux2-klein-base-9b": {
        "command": "mflux-generate-flux2",
        "supports_img2img": False,
        "supports_cfg": True,
        "default_steps": 16,
        "default_guidance": 3.5,
    },
    "flux2-klein-base-4b": {
        "command": "mflux-generate-flux2",
        "supports_img2img": False,
        "supports_cfg": True,
        "default_steps": 16,
        "default_guidance": 3.5,
    },

    # ── Z-Image family ─────────────────────────────────────────────
    "z-image-turbo": {
        "command": "mflux-generate-z-image-turbo",
        "supports_img2img": True,
        "supports_cfg": True,
        "default_steps": 9,
        "default_guidance": 3.5,
    },
    "z-image": {
        "command": "mflux-generate-z-image",
        "supports_img2img": True,
        "supports_cfg": True,
        "default_steps": 9,
        "default_guidance": 3.5,
    },

    # ── Moss Image — uncomment when mflux supports it ──────────────
    # "moss-image-sft": {
    #     "command": "mflux-generate-moss-image",
    #     "supports_img2img": False,
    #     "supports_cfg": True,
    #     "default_steps": 25,
    #     "default_guidance": 3.5,
    # },

    # ── Other supported models ─────────────────────────────────────
    "fibo": {
        "command": "mflux-generate-fibo",
        "supports_img2img": False,
        "supports_cfg": True,
        "default_steps": 16,
        "default_guidance": 3.5,
    },
    "fibo-lite": {
        "command": "mflux-generate-fibo",
        "supports_img2img": False,
        "supports_cfg": True,
        "default_steps": 16,
        "default_guidance": 3.5,
    },
    "fibo-edit": {
        "command": "mflux-generate-fibo-edit",
        "supports_img2img": True,
        "supports_cfg": True,
        "default_steps": 16,
        "default_guidance": 3.5,
    },
    "fibo-edit-rmbg": {
        "command": "mflux-generate-fibo-edit",
        "supports_img2img": True,
        "supports_cfg": True,
        "default_steps": 16,
        "default_guidance": 3.5,
    },
    "z-image-turbo-controlnet-union-2.1": {
        "command": "mflux-generate-z-image-turbo",
        "supports_img2img": True,
        "supports_cfg": True,
        "default_steps": 9,
        "default_guidance": 3.5,
    },
    "ming-image-design": {
        "command": "mflux-generate-ming",
        "supports_img2img": False,
        "supports_cfg": True,
        "default_steps": 16,
        "default_guidance": 3.5,
    },
    "lens-turbo": {
        "command": "mflux-generate-lens",
        "supports_img2img": False,
        "supports_cfg": True,
        "default_steps": 16,
        "default_guidance": 3.5,
    },
    "seedvr2-3b": {
        "command": "mflux-generate",
        "supports_img2img": False,
        "supports_cfg": True,
        "default_steps": 16,
        "default_guidance": 3.5,
    },
    "seedvr2-7b": {
        "command": "mflux-generate",
        "supports_img2img": False,
        "supports_cfg": True,
        "default_steps": 16,
        "default_guidance": 3.5,
    },
    "ideogram-4-fp8": {
        "command": "mflux-generate-ideogram4",
        "supports_img2img": False,
        "supports_cfg": True,
        "default_steps": 16,
        "default_guidance": 3.5,
    },
    "boogu-image-turbo": {
        "command": "mflux-generate-boogu",
        "supports_img2img": False,
        "supports_cfg": True,
        "default_steps": 16,
        "default_guidance": 3.5,
    },
    "ernie-image": {
        "command": "mflux-generate-ernie-image",
        "supports_img2img": False,
        "supports_cfg": True,
        "default_steps": 16,
        "default_guidance": 3.5,
    },
    "ernie-image-turbo": {
        "command": "mflux-generate-ernie-image-turbo",
        "supports_img2img": False,
        "supports_cfg": True,
        "default_steps": 16,
        "default_guidance": 3.5,
    },
}


def get_command_for_base_model(base_model: str) -> str | None:
    """Return the CLI command for a base model, or None if not found."""
    entry = MODEL_COMMANDS.get(base_model)
    return entry["command"] if entry else None


def supports_img2img(base_model: str) -> bool:
    """Check if a base model supports image-to-image."""
    entry = MODEL_COMMANDS.get(base_model)
    return entry.get("supports_img2img", False) if entry else False


def supports_cfg(base_model: str) -> bool:
    """Check if a base model supports CFG (classifier-free guidance)."""
    entry = MODEL_COMMANDS.get(base_model)
    return entry.get("supports_cfg", True) if entry else True  # default: supports CFG


def get_model_info(base_model: str) -> dict | None:
    """Return full model info dict, or None."""
    return MODEL_COMMANDS.get(base_model)
