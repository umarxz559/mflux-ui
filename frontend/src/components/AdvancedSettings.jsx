import { useState } from 'react'

export default function AdvancedSettings({
  seed,
  guidanceScale,
  numInferenceSteps,
  computePrecision,
  onSeedChange,
  onGuidanceScaleChange,
  onNumInferenceStepsChange,
  onComputePrecisionChange,
}) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        className={`advanced-toggle ${open ? 'open' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <span className='arrow'>▶</span> Advanced Settings
      </button>

      {open && (
        <div className='advanced-settings'>
          <div className='setting-row'>
            <label htmlFor='seed'>Seed</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                id='seed'
                type='number'
                value={seed}
                onChange={e => onSeedChange(parseInt(e.target.value) || 0)}
                style={{ width: 100 }}
              />
              <button
                onClick={() => onSeedChange(Math.floor(Math.random() * 999999999))}
                style={{
                  padding: '6px 10px',
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: 6,
                  color: '#aaa',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontFamily: 'inherit',
                }}
                title='Random seed'
              >
                🎲
              </button>
            </div>
          </div>

          <div className='setting-row'>
            <label htmlFor='guidance'>Guidance Scale</label>
            <input
              id='guidance'
              type='number'
              step='0.5'
              min='1'
              max='20'
              value={guidanceScale}
              onChange={e => onGuidanceScaleChange(parseFloat(e.target.value) || 7.5)}
            />
          </div>

          <div className='setting-row'>
            <label htmlFor='steps'>Inference Steps</label>
            <input
              id='steps'
              type='number'
              min='1'
              max='100'
              value={numInferenceSteps}
              onChange={e => onNumInferenceStepsChange(parseInt(e.target.value) || 25)}
            />
          </div>

          <div className='setting-row'>
            <label htmlFor='precision'>Compute Precision</label>
            <select
              id='precision'
              value={computePrecision}
              onChange={e => onComputePrecisionChange(e.target.value)}
            >
              <option value='float16'>float16</option>
              <option value='float32'>float32</option>
              <option value='bfloat16'>bfloat16</option>
              <option value='int8'>int8</option>
              <option value='int4'>int4</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
