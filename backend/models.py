from pydantic import BaseModel, Field, ConfigDict
from typing import Optional


class GenerateRequest(BaseModel):
    """Request body for image generation."""

    model_config = ConfigDict(
        # Accept both camelCase and snake_case field names
        populate_by_name=True,
    )

    model: str = Field(..., description="HuggingFace model name")
    base_model: str = Field(
        ..., alias="baseModel", description="Base model identifier"
    )
    prompt: str = Field(..., description="Text prompt")
    negative_prompt: Optional[str] = Field(
        None, alias="negativePrompt", description="Negative prompt"
    )
    width: int = Field(1024, ge=256, le=4096, description="Image width")
    height: int = Field(1024, ge=256, le=4096, description="Image height")
    seed: int = Field(42, ge=0, le=999999999, description="Random seed")
    guidance_scale: float = Field(
        7.5, ge=1.0, le=20.0, alias="guidanceScale", description="Guidance scale"
    )
    num_inference_steps: int = Field(
        25, ge=1, le=100, alias="numInferenceSteps", description="Inference steps"
    )
    compute_precision: str = Field(
        "float16", alias="computePrecision", description="Compute precision"
    )
    image: Optional[str] = Field(
        None,
        description="Base64-encoded input image for img2img",
    )
    strength: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="Denoising strength for img2img",
    )


class ModelDiscoveryResponse(BaseModel):
    """Response from model discovery endpoint."""

    models: list[str] = Field(
        ...,
        description="List of HF model names found in local cache",
    )


class ErrorResponse(BaseModel):
    """Error response."""

    detail: str
