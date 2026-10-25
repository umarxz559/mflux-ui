import { useState, useRef } from 'react'

function compressImage(file, maxWidth = 1024, quality = 0.7) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width
        let h = img.height
        if (w > maxWidth) {
          h = (maxWidth / w) * h
          w = maxWidth
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

export default function ImageUpload({
  imageBase64,
  onImageUpload,
  onClearImage,
  strength,
  onStrengthChange,
  img2imgSupported,
}) {
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  const handleFile = async (file) => {
    if (!file) return
    const base64 = await compressImage(file)
    onImageUpload(base64, file.name)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  if (!img2imgSupported) {
    return null
  }

  return (
    <div>
      <div className='section-title'>
        Image to Image
        <span style={{ color: '#555', fontWeight: 400, marginLeft: 8 }}>
          (only {getModelDisplayName()} supports this)
        </span>
      </div>

      <div
        className={`image-upload-area ${imageBase64 ? 'has-image' : ''} ${dragOver ? 'drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type='file'
          accept='image/*'
          onChange={e => handleFile(e.target.files[0])}
        />

        {imageBase64 ? (
          <>
            <img src={imageBase64} alt='Uploaded' className='preview-img' />
            <button
              className='clear-image-btn'
              onClick={e => { e.stopPropagation(); onClearImage() }}
              title='Remove image'
            >
              ×
            </button>
          </>
        ) : (
          <div className='upload-label'>
            <strong>Click to upload</strong> or drag &amp; drop<br />
            <span style={{ fontSize: 12, color: '#666' }}>PNG, JPG up to 10 MB</span>
          </div>
        )}
      </div>

      {imageBase64 && (
        <div className='strength-row'>
          <label style={{ fontSize: 13, color: '#999', whiteSpace: 'nowrap' }}>
            Denoising strength
          </label>
          <input
            type='range'
            min='0'
            max='1'
            step='0.05'
            value={strength}
            onChange={e => onStrengthChange(parseFloat(e.target.value))}
          />
          <span className='strength-value'>{strength.toFixed(2)}</span>
        </div>
      )}
    </div>
  )
}

function getModelDisplayName() {
  return 'Qwen Image 2.1 Turbo'
}
