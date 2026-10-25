import { useState } from 'react'

export default function OutputPanel({ output, images, selectedMeta, onSelectImage }) {
  const [downloading, setDownloading] = useState(false)
  const [showMeta, setShowMeta] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await fetch(output)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mflux-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setDownloading(false)
    }
  }

  const handleOpen = () => {
    window.open(output, '_blank')
  }

  return (
    <div className='output-panel'>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
        {output ? (
          <>
            <img src={output} alt='Generated' className='output-image' />

            {/* Actions */}
            <div className='output-actions'>
              <button onClick={handleOpen} disabled={downloading}>
                ↗ Open Original
              </button>
              <button onClick={handleDownload} disabled={downloading}>
                {downloading ? 'Downloading...' : '⬇ Download PNG'}
              </button>
            </div>

            {/* Metadata toggle */}
            {selectedMeta && (
              <div className='meta-toggle-row'>
                <button className='meta-toggle-btn' onClick={() => setShowMeta(!showMeta)}>
                  <span className='arrow'>{showMeta ? '▾' : '▸'}</span> Generation Details
                </button>
                {showMeta && <MetadataDisplay meta={selectedMeta} />}
              </div>
            )}
          </>
        ) : (
          <div className='output-placeholder'>
            <div className='icon'>🎨</div>
            <div>Your generated image will appear here</div>
          </div>
        )}

        {/* Gallery always shown at bottom */}
        {images.length > 0 && <GallerySection images={images} onSelect={onSelectImage} />}
      </div>
    </div>
  )
}

/* ---- Metadata display ---- */

function MetadataDisplay({ meta }) {
  const fields = [
    { label: 'Prompt', value: meta.prompt, multiline: true },
    { label: 'Model', value: meta.model },
    { label: 'Steps', value: meta.steps },
    { label: 'Guidance', value: meta.guidance },
    { label: 'Size', value: meta.width && meta.height ? `${meta.width} × ${meta.height}` : null },
    { label: 'Seed', value: meta.seed },
    { label: 'Time', value: meta.generation_time ? `${meta.generation_time}s` : null },
    { label: 'Peak Memory', value: meta.peak_memory ? `${meta.peak_memory} ${meta.peak_memory_unit || 'GB'}` : null },
  ]

  return (
    <div className='meta-panel'>
      {fields.map(({ label, value, multiline }) =>
        value != null ? (
          <div key={label} className='meta-row'>
            <span className='meta-label'>{label}</span>
            {multiline ? (
              <span className='meta-value-multiline'>{value}</span>
            ) : (
              <span className='meta-value'>{value}</span>
            )}
          </div>
        ) : null
      )}
    </div>
  )
}

/* ---- Image gallery ---- */

function GallerySection({ images, onSelect }) {
  return (
    <div className='gallery-section'>
      <div className='gallery-title'>Generated Images ({images.length})</div>
      <div className='gallery-grid'>
        {images.map((img) => {
          const uuid = img.image_id
          const thumbUrl = `/api/image/${uuid}.png`
          return (
            <button
              key={uuid}
              className='gallery-thumb'
              onClick={() => onSelect(img)}
              title={img.prompt?.slice(0, 80) || 'No prompt'}
            >
              <img src={thumbUrl} alt='' className='gallery-thumb-img' loading='lazy' />
              <div className='gallery-thumb-info'>
                <span className='gallery-thumb-time'>{formatTime(img.timestamp)}</span>
                <span className='gallery-thumb-steps'>{img.steps} steps</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function formatTime(isoString) {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}
