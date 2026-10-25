import { useState } from 'react'

export default function OutputPanel({ output }) {
  const [downloading, setDownloading] = useState(false)

  if (!output) {
    return (
      <div className='output-panel'>
        <div className='output-placeholder'>
          <div className='icon'>🎨</div>
          <div>Your generated image will appear here</div>
        </div>
      </div>
    )
  }

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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <img src={output} alt='Generated' className='output-image' />
        <div className='output-actions'>
          <button onClick={handleOpen} disabled={downloading}>
            ↗ Open Original
          </button>
          <button onClick={handleDownload} disabled={downloading}>
            {downloading ? 'Downloading...' : '⬇ Download PNG'}
          </button>
        </div>
      </div>
    </div>
  )
}
