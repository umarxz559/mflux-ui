import { PRESET_SIZES } from '../constants'

export default function SizeSelector({
  width,
  height,
  onSizeChange,
}) {
  const isCustom = !PRESET_SIZES.some(
    s => s.width === width && s.height === height
  )

  return (
    <div>
      <div className="section-title">Image Size</div>
      <div className="size-row">
        <select
          value={isCustom ? 'custom' : PRESET_SIZES.findIndex(
            s => s.width === width && s.height === height
          )}
          onChange={e => {
            if (e.target.value === 'custom') return
            const idx = parseInt(e.target.value)
            onSizeChange(PRESET_SIZES[idx].width, PRESET_SIZES[idx].height)
          }}
        >
          {PRESET_SIZES.map((s, i) => (
            <option key={i} value={i}>{s.label}</option>
          ))}
          <option value='custom'>Custom...</option>
        </select>

        {isCustom && (
          <div className='custom-size'>
            <input
              type='number'
              value={width}
              min={256}
              max={4096}
              step={64}
              onChange={e => onSizeChange(parseInt(e.target.value) || 1024, height)}
              aria-label='Width'
            />
            <span>×</span>
            <input
              type='number'
              value={height}
              min={256}
              max={4096}
              step={64}
              onChange={e => onSizeChange(width, parseInt(e.target.value) || 1024)}
              aria-label='Height'
            />
          </div>
        )}
      </div>
    </div>
  )
}
