// =============================================================================
// MODELS CONFIGURATION
//
// Models are auto-discovered from `hf cache ls --json` at runtime.
// This file provides:
//   - DEFAULT_MODELS: fallback model list used when cache discovery fails
//   - MODEL_INFO: metadata for each model (display name, img2img support, etc.)
//
// To add a new model:
//   1. Add entry to DEFAULT_MODELS below
//   2. Add entry to MODEL_INFO below
//   3. Add entry to backend/commands.py
// =============================================================================

export const DEFAULT_MODELS = [
  'mflux-community/qwen-image-2-1-turbo-mflux-q8',
  'mflux-community/flux-3-image-klein-mflux-q8',
  'mflux-community/z-image-turbo-mflux-q8',
  // 'mflux-community/moss-image-sft-mflux-q8',  // Uncomment when mflux supports it
]

// =============================================================================
// MODEL METADATA — display names and features
// Keys must match the hfModel values in DEFAULT_MODELS
// =============================================================================

export const MODEL_INFO = {
  'mflux-community/qwen-image-2-1-turbo-mflux-q8': {
    displayName: 'Qwen Image 2.1 Turbo (Q8)',
    baseModel: 'qwen-image-2.1-turbo',
    supportsImg2Img: true,
    defaultSteps: 8,
    defaultGuidance: 1.0,  // Qwen 2.1 Turbo runs without CFG
  },
  'mflux-community/flux-3-image-klein-mflux-q8': {
    displayName: 'FLUX.3 Image Klein (Q8)',
    baseModel: 'flux3-image-klein',
    supportsImg2Img: false,
    defaultSteps: 16,
    defaultGuidance: 3.5,
  },
  'mflux-community/z-image-turbo-mflux-q8': {
    displayName: 'Z-Image Turbo (Q8)',
    baseModel: 'z-image-turbo',
    supportsImg2Img: true,
    defaultSteps: 9,
    defaultGuidance: 3.5,
  },
  'mflux-community/moss-image-sft-mflux-q8': {
    displayName: 'Moss Image SFT (Q8)',
    baseModel: 'moss-image-sft',
    supportsImg2Img: false,
    defaultSteps: 25,
    defaultGuidance: 3.5,
  },
}

// =============================================================================
// PRESET SIZES — famous portrait & landscape aspect ratios
// =============================================================================

export const PRESET_SIZES = [
  // Square (1:1)
  { label: '1024 × 1024 (1:1)', width: 1024, height: 1024 },
  { label: '512 × 512 (1:1)', width: 512, height: 512 },
  { label: '2048 × 2048 (1:1)', width: 2048, height: 2048 },

  // Portrait (3:4)
  { label: '768 × 1024 (3:4)', width: 768, height: 1024 },
  { label: '1152 × 1536 (3:4)', width: 1152, height: 1536 },

  // Landscape (4:3)
  { label: '1024 × 768 (4:3)', width: 1024, height: 768 },
  { label: '1536 × 1152 (4:3)', width: 1536, height: 1152 },

  // Portrait (9:16)
  { label: '720 × 1280 (9:16)', width: 720, height: 1280 },
  { label: '1080 × 1920 (9:16)', width: 1080, height: 1920 },

  // Landscape (16:9)
  { label: '1280 × 720 (16:9)', width: 1280, height: 720 },
  { label: '1920 × 1080 (16:9)', width: 1920, height: 1080 },

  // Landscape (21:9)
  { label: '1680 × 720 (21:9)', width: 1680, height: 720 },
  { label: '2560 × 1080 (21:9)', width: 2560, height: 1080 },

  // Classic photo (3:2)
  { label: '1536 × 1024 (3:2)', width: 1536, height: 1024 },
  { label: '1024 × 683 (3:2)', width: 1024, height: 683 },

  // Instagram portrait (4:5)
  { label: '1080 × 1350 (4:5)', width: 1080, height: 1350 },
]

// =============================================================================
// DEFAULT SETTINGS (used when nothing is saved in localStorage)
// =============================================================================

const defaultModel = DEFAULT_MODELS[0]
const defaultInfo = MODEL_INFO[defaultModel] || {}

export const DEFAULT_SETTINGS = {
  model: defaultModel,
  baseModel: defaultInfo.baseModel || 'qwen-image-2.1-turbo',
  prompt: '',
  negativePrompt: '',
  width: 1024,
  height: 1024,
  seed: 42,
  guidanceScale: defaultInfo.defaultGuidance || 7.5,
  numInferenceSteps: defaultInfo.defaultSteps || 25,
  computePrecision: 'float16',
  imageBase64: null,
  imageUrl: null,
  strength: 0.5,
}

// Helper: get model info by hfModel name
export function getModelInfo(hfModel) {
  return MODEL_INFO[hfModel] || {
    displayName: hfModel,
    baseModel: hfModel.split('/').pop()?.replace('-mflux-q8', '') || 'unknown',
    supportsImg2Img: false,
    defaultSteps: 25,
    defaultGuidance: 7.5,
  }
}

// Backwards-compatible aliases
export const MODELS = DEFAULT_MODELS
export const getModelByHfModel = getModelInfo
