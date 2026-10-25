import { MODELS, getModelByHfModel } from '../constants'

export default function ModelSelector({
  models,
  selectedModel,
  selectedBaseModel,
  onModelChange,
}) {
  // Determine which model configs are available locally
  const availableModels = models.length > 0 ? models : MODELS

  const modelConfig = getModelByHfModel(selectedModel)

  return (
    <div>
      <div className="section-title">
        Model
        {modelConfig?.supportsImg2Img && (
          <span className='img2img-badge'>Img2Img</span>
        )}
      </div>
      <select
        value={selectedModel}
        onChange={e => {
          const config = getModelByHfModel(e.target.value)
          onModelChange(e.target.value, config.baseModel)
        }}
      >
        {availableModels.map(m => (
          <option key={m} value={m}>
            {getModelByHfModel(m)?.displayName || m}
          </option>
        ))}
        {availableModels.length === 0 && (
          <option value=''>— No models found —</option>
        )}
      </select>
      {modelConfig && (
        <div style={{ marginTop: 6, fontSize: 12, color: '#666', wordBreak: 'break-all' }}>
          {modelConfig.hfModel}
        </div>
      )}
    </div>
  )
}
