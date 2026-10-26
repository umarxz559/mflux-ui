"""
Image metadata store — persists generation metadata alongside generated images.

Each generated image gets a .json sidecar file with the same UUID, containing:
  - prompt, negative_prompt, model, base_model
  - width, height, seed, steps, guidance
  - generation_time, peak_memory
  - timestamp (ISO 8601)

A single index file (IMAGES_DIR / ".metadata_index.json") maps UUID -> .json path
for fast listing.
"""

import json
import threading
from datetime import datetime, timezone
from pathlib import Path

IMAGES_DIR = Path(__file__).parent / ".generated_images"
INDEX_PATH = IMAGES_DIR / ".metadata_index.json"

_lock = threading.Lock()


def _load_index() -> dict:
    """Load the metadata index from disk."""
    try:
        if INDEX_PATH.exists():
            with open(INDEX_PATH, "r") as f:
                return json.load(f)
    except (json.JSONDecodeError, OSError):
        pass
    return {}


def _save_index(index: dict):
    """Write the metadata index to disk."""
    try:
        with open(INDEX_PATH, "w") as f:
            json.dump(index, f, indent=2)
    except OSError:
        pass


def save_metadata(image_id: str, metadata: dict):
    """
    Save metadata for a generated image.

    Args:
        image_id: UUID hex string (without extension), e.g. "abc123def456"
        metadata: dict with keys like prompt, model, steps, etc.
    """
    with _lock:
        index = _load_index()

        # Sidecar JSON file
        meta_path = IMAGES_DIR / f"{image_id}.meta.json"
        entry = {
            "image_id": image_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            **metadata,
        }
        with open(meta_path, "w") as f:
            json.dump(entry, f, indent=2)

        index[image_id] = str(meta_path)
        _save_index(index)


def get_metadata(image_id: str) -> dict | None:
    """
    Retrieve metadata for a specific image.

    Returns None if not found.
    """
    with _lock:
        index = _load_index()
        meta_path = index.get(image_id)
        if not meta_path:
            # Try scanning for sidecar file directly
            candidate = IMAGES_DIR / f"{image_id}.meta.json"
            if candidate.exists():
                index[image_id] = str(candidate)
                _save_index(index)
                meta_path = str(candidate)
            else:
                return None

        try:
            with open(meta_path, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return None


def delete_image(image_id: str) -> bool:
    """
    Delete an image file and its metadata.

    Returns True if the image was found and deleted.
    """
    with _lock:
        index = _load_index()
        if image_id not in index:
            return False

        success = True

        # Remove the image file
        img_path = IMAGES_DIR / f"{image_id}.png"
        if img_path.exists():
            try:
                img_path.unlink()
            except OSError:
                success = False

        # Remove the sidecar metadata file
        meta_path = IMAGES_DIR / f"{image_id}.meta.json"
        if meta_path.exists():
            try:
                meta_path.unlink()
            except OSError:
                success = False

        # Remove from index
        del index[image_id]
        _save_index(index)

        return success


def list_images() -> list[dict]:
    """
    List all generated images with their metadata, newest first.

    Returns list of dicts:
      { image_id, path, prompt, model, steps, generation_time, peak_memory, timestamp, ... }
    """
    with _lock:
        index = _load_index()

        results = []
        for image_id, meta_path in index.items():
            try:
                with open(meta_path, "r") as f:
                    meta = json.load(f)
                results.append(meta)
            except (json.JSONDecodeError, OSError):
                pass

        # Sort by timestamp descending
        results.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return results
