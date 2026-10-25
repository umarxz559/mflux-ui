import { useState, useEffect, useRef } from 'react'
import ModelSelector from './components/ModelSelector'
import SizeSelector from './components/SizeSelector'
import PromptInput from './components/PromptInput'
import ImageUpload from './components/ImageUpload'
import AdvancedSettings from './components/AdvancedSettings'
import OutputPanel from './components/OutputPanel'
import { DEFAULT_SETTINGS, getModelInfo } from './constants'
import './App.css'

const STORAGE_KEY = 'mflux-ui-settings'
const STREAM_TIMEOUT_MS = 120_000 // 2 min safety timeout

function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // Never restore prompt/negativePrompt — always start fresh
      return { ...DEFAULT_SETTINGS, prompt: '', negativePrompt: '', ...parsed }
    }
  } catch {}
  return { ...DEFAULT_SETTINGS, prompt: '', negativePrompt: '' }
}

function saveSettings(settings) {
  try {
    // Never persist prompt or negativePrompt
    const { prompt, negativePrompt, ...safe } = settings
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe))
  } catch {}
}

export default function App() {
  const [settings, setSettings] = useState(loadSettings)
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState(null)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState({ percent: 0, current: 0, total: 0 })
  const [peakMemory, setPeakMemory] = useState(null)
  const [generationTime, setGenerationTime] = useState(null)
  const [rawOutput, setRawOutput] = useState('')
  const [images, setImages] = useState([])
  const [selectedMeta, setSelectedMeta] = useState(null)
  const doneRef = useRef(false)
  const readerRef = useRef(null)

  // Load models on mount
  useEffect(() => {
    fetch('/api/models')
      .then(res => res.json())
      .then(data => {
        if (data.models?.length) setModels(data.models)
      })
      .catch(() => setModels([]))
  }, [])

  // Load generated images on mount
  useEffect(() => {
    fetch('/api/images')
      .then(res => res.json())
      .then(data => {
        if (data.images?.length) setImages(data.images)
      })
      .catch(() => setImages([]))
  }, [])

  // Save settings whenever they change
  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  // Refresh images list when output changes (new image generated)
  useEffect(() => {
    if (output) {
      fetch('/api/images')
        .then(res => res.json())
        .then(data => {
          if (data.images?.length) setImages(data.images)
        })
        .catch(() => {})
    }
  }, [output])

  // Handle model change — reset steps/guidance to model defaults
  const handleModelChange = (model, baseModel) => {
    const info = getModelInfo(model)
    setSettings(prev => ({
      ...prev,
      model,
      baseModel,
      numInferenceSteps: info.defaultSteps ?? prev.numInferenceSteps,
      guidanceScale: info.defaultGuidance ?? prev.guidanceScale,
    }))
  }

  // Stable SSE event handler via ref (avoid closure staleness)
  const sseHandlerRef = useRef(null)
  sseHandlerRef.current = (data) => {
    switch (data.type) {
      case 'progress':
        setProgress({
          percent: data.percent,
          current: data.current,
          total: data.total,
        })
        setGenerationTime(data.timing)
        break
      case 'raw':
        setRawOutput(prev => prev + data.text + '\n')
        break
      case 'image_saved':
        // silent — image is being saved
        break
      case 'metadata_embedded':
        // silent
        break
      case 'peak_memory':
        setPeakMemory({ value: data.value, unit: data.unit })
        break
      case 'done':
        doneRef.current = true
        setOutput(prev => data.image ?? prev)
        setProgress(prev => ({ ...prev, percent: 100 }))
        // Find the newly generated image metadata
        fetch('/api/images')
          .then(res => res.json())
          .then(data => {
            if (data.images?.length) {
              setImages(data.images)
              // The first image is the newest one
              const newest = data.images[0]
              if (newest) setSelectedMeta(newest)
            }
          })
          .catch(() => {})
        break
      case 'error':
        setError(data.message)
        setProgress({ percent: 0, current: 0, total: 0 })
        setPeakMemory(null)
        setGenerationTime(null)
        break
    }
  }

  const processBuffer = (buffer) => {
    const lines = buffer.split(/\r?\n/)
    const remaining = lines.pop() || ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const data = JSON.parse(line.slice(6))
        sseHandlerRef.current?.(data)
      } catch {}
    }
    // Try to parse any remaining partial JSON (handles done event without trailing newline)
    if (remaining.trim()) {
      try {
        const trimmed = remaining.trim()
        if (trimmed.startsWith('{')) {
          const data = JSON.parse(trimmed)
          sseHandlerRef.current?.(data)
        }
      } catch {}
    }
    return ''
  }

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setOutput(null)
    setProgress({ percent: 0, current: 0, total: 0 })
    setPeakMemory(null)
    setGenerationTime(null)
    setRawOutput('')
    setSelectedMeta(null)
    doneRef.current = false

    let reader = null
    let timedOut = false

    try {
      const body = {
        model: settings.model,
        baseModel: settings.baseModel,
        prompt: settings.prompt,
        negativePrompt: settings.negativePrompt || undefined,
        width: settings.width,
        height: settings.height,
        seed: settings.seed,
        guidanceScale: settings.guidanceScale,
        numInferenceSteps: settings.numInferenceSteps,
        computePrecision: settings.computePrecision,
      }

      if (settings.imageBase64) {
        body.image = settings.imageBase64
        body.strength = settings.strength || 0.5
      }

      const response = await fetch('/api/generate-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      // Safety timeout
      const timeoutId = setTimeout(() => {
        timedOut = true
        reader.cancel('Stream timeout').catch(() => {})
      }, STREAM_TIMEOUT_MS)

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done || timedOut) break

          buffer += decoder.decode(value, { stream: true })
          buffer = processBuffer(buffer)
        }

        // Process any remaining buffer after stream ends
        if (buffer.trim()) {
          processBuffer(buffer)
        }
      } finally {
        clearTimeout(timeoutId)
        readerRef.current = null
        setLoading(false)
      }

      readerRef.current = reader
    } catch (err) {
      if (!doneRef.current) {
        setError(err.message || 'Connection lost')
        setProgress({ percent: 0, current: 0, total: 0 })
      }
      setLoading(false)
      readerRef.current = null
    }
  }

  // Handle gallery thumbnail click — load image + metadata
  const handleSelectImage = (meta) => {
    const imgId = meta.image_id
    setOutput(`/api/image/${imgId}.png`)
    setSelectedMeta(meta)
    setProgress({ percent: 0, current: 0, total: 0 })
    setPeakMemory(null)
    setGenerationTime(null)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>mflux UI</h1>
        <span className="subtitle">Image Generation with mflux</span>
      </header>

      <main className="app-main">
        {/* Left Panel - Controls */}
        <section className="controls-panel">
          <ModelSelector
            models={models}
            selectedModel={settings.model}
            selectedBaseModel={settings.baseModel}
            onModelChange={handleModelChange}
          />

          <SizeSelector
            width={settings.width}
            height={settings.height}
            onSizeChange={(w, h) => {
              setSettings(prev => ({ ...prev, width: w, height: h }))
            }}
          />

          <PromptInput
            prompt={settings.prompt}
            negativePrompt={settings.negativePrompt}
            onPromptChange={p => setSettings(prev => ({ ...prev, prompt: p }))}
            onNegativePromptChange={np => setSettings(prev => ({ ...prev, negativePrompt: np }))}
          />

          <ImageUpload
            imageBase64={settings.imageBase64}
            imageUrl={settings.imageUrl}
            onImageUpload={(base64, url) => {
              setSettings(prev => ({ ...prev, imageBase64: base64, imageUrl: url }))
            }}
            onClearImage={() => {
              setSettings(prev => ({ ...prev, imageBase64: null, imageUrl: null }))
            }}
            strength={settings.strength}
            onStrengthChange={s => setSettings(prev => ({ ...prev, strength: s }))}
            img2imgSupported={settings.baseModel === 'qwen-image-2.1-turbo'}
          />

          <AdvancedSettings
            seed={settings.seed}
            guidanceScale={settings.guidanceScale}
            numInferenceSteps={settings.numInferenceSteps}
            computePrecision={settings.computePrecision}
            onSeedChange={v => setSettings(prev => ({ ...prev, seed: v }))}
            onGuidanceScaleChange={v => setSettings(prev => ({ ...prev, guidanceScale: v }))}
            onNumInferenceStepsChange={v => setSettings(prev => ({ ...prev, numInferenceSteps: v }))}
            onComputePrecisionChange={v => setSettings(prev => ({ ...prev, computePrecision: v }))}
          />

          <button
            className="generate-btn"
            onClick={handleGenerate}
            disabled={loading || !settings.prompt.trim()}
          >
            {loading ? 'Generating...' : 'Generate'}
          </button>

          {/* Progress bar — percentage only, hidden when done */}
          {loading && progress.percent > 0 && progress.percent < 100 && (
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${Math.min(progress.percent, 100)}%` }}
              />
              <div className="progress-bar-text">{progress.percent}%</div>
            </div>
          )}

          {/* Generation details — shown below progress bar while loading */}
          {loading && (progress.current > 0 || peakMemory) && (
            <div className="progress-details">
              {progress.current > 0 && (
                <div className="detail-row">
                  <span className="detail-label">Step</span>
                  <span className="detail-value">{progress.current} / {progress.total}</span>
                </div>
              )}
              {generationTime && (
                <div className="detail-row">
                  <span className="detail-label">Elapsed</span>
                  <span className="detail-value">{generationTime}</span>
                </div>
              )}
              {peakMemory && (
                <div className="detail-row">
                  <span className="detail-label">Peak Memory</span>
                  <span className="detail-value">{peakMemory.value} {peakMemory.unit}</span>
                </div>
              )}
            </div>
          )}

          {/* Raw output (for debugging) */}
          {rawOutput && (
            <details className="raw-output">
              <summary>Raw output</summary>
              <pre>{rawOutput}</pre>
            </details>
          )}

          {error && <div className="error">Error: {error}</div>}
        </section>

        {/* Right Panel - Output */}
        <OutputPanel
          output={output}
          images={images}
          selectedMeta={selectedMeta}
          onSelectImage={handleSelectImage}
        />
      </main>
    </div>
  )
}
