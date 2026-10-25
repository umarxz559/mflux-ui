export default function PromptInput({
  prompt,
  negativePrompt,
  onPromptChange,
  onNegativePromptChange,
}) {
  return (
    <div className='prompt-group'>
      <div className='section-title'>Prompt</div>
      <textarea
        value={prompt}
        onChange={e => onPromptChange(e.target.value)}
        placeholder='Describe the image you want to generate...'
      />

      <div className='section-title negative-prompt'>
        Negative Prompt <span style={{ color: '#555', fontWeight: 400 }}>(optional)</span>
      </div>
      <textarea
        className='negative-prompt'
        value={negativePrompt}
        onChange={e => onNegativePromptChange(e.target.value)}
        placeholder='Things to exclude from the image...'
        style={{ minHeight: 50 }}
      />
    </div>
  )
}
