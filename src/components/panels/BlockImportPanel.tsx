import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import type { PanelProps } from './types'

export function BlockImportPanel({ node }: PanelProps) {
  const { t } = useTranslation()
  const [jsonInput, setJsonInput] = useState('')
  const [parsedData, setParsedData] = useState<any>(null)
  const [formData, setFormData] = useState({
    block_type: '',
    layer: 1,
    slug: '',
    name: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleJsonChange = (value: string) => {
    setJsonInput(value)
    setError(null)
    
    if (!value.trim()) {
      setParsedData(null)
      return
    }

    try {
      const parsed = JSON.parse(value)
      setParsedData(parsed)
      
      // Auto-extract metadata if present
      const newFormData = { ...formData }
      
      if (parsed.meta_id) {
        newFormData.slug = parsed.meta_id
      }
      if (parsed.slug) {
        newFormData.slug = parsed.slug
      }
      if (parsed.layer !== undefined) {
        newFormData.layer = parsed.layer
      }
      if (parsed.name) {
        newFormData.name = parsed.name
      }
      
      // Auto-detect block type from rhythmic fields
      if (parsed.bpm || parsed.time_signature || parsed.pattern) {
        newFormData.block_type = 'Rhythm'
      } else if (parsed.pitch || parsed.scale || parsed.harmony) {
        newFormData.block_type = 'Logic'
      } else if (parsed.reverb || parsed.delay || parsed.spatial) {
        newFormData.block_type = 'Space'
      } else if (parsed.waveform || parsed.filter || parsed.envelope) {
        newFormData.block_type = 'Timbre'
      }
      
      setFormData(newFormData)
    } catch (err) {
      setError('Invalid JSON')
      setParsedData(null)
    }
  }

  const handleSubmit = async () => {
    if (!parsedData) {
      setError('No valid JSON to import')
      return
    }

    setLoading(true)
    try {
      const payload = {
        block_type: formData.block_type || 'Unknown',
        layer: formData.layer,
        slug: formData.slug || `block_${Date.now()}`,
        name: formData.name || null,
        content: parsedData,
      }

      const response = await fetch('http://localhost:8005/api/music-blocks/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to create block')
      }

      const result = await response.json()
      console.log('Block created:', result)
      
      // Reset form
      setJsonInput('')
      setParsedData(null)
      setFormData({ block_type: '', layer: 1, slug: '', name: '' })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import block')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="panel-shell">
      <div className="panel-card space-y-4">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">{node.getName()}</p>
          <h2 className="text-xl font-semibold text-slate-50">
            <Trans t={t} i18nKey="blockImport.title" />
          </h2>
          <p className="text-sm text-slate-300">
            <Trans t={t} i18nKey="blockImport.description" />
          </p>
        </header>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              <Trans t={t} i18nKey="blockImport.jsonInput" />
            </label>
            <textarea
              className="h-48 w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 font-mono outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
              onChange={(e) => handleJsonChange(e.target.value)}
              placeholder={t('blockImport.jsonPlaceholder')}
              value={jsonInput}
            />
            {error && (
              <p className="mt-2 text-sm text-red-400">{error}</p>
            )}
          </div>

          {parsedData && (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  <Trans t={t} i18nKey="blockImport.blockType" />
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
                  onChange={(e) => setFormData({ ...formData, block_type: e.target.value })}
                  placeholder="Logic, Rhythm, Space, Timbre"
                  type="text"
                  value={formData.block_type}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  <Trans t={t} i18nKey="blockImport.layer" />
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
                  onChange={(e) => setFormData({ ...formData, layer: parseInt(e.target.value) || 1 })}
                  placeholder="1"
                  type="number"
                  value={formData.layer}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  <Trans t={t} i18nKey="blockImport.slug" />
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="meta_122"
                  type="text"
                  value={formData.slug}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  <Trans t={t} i18nKey="blockImport.name" />
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Block name"
                  type="text"
                  value={formData.name}
                />
              </div>
            </div>
          )}

          <button
            className="w-full rounded-full bg-cyan-400 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
            disabled={!parsedData || loading}
            onClick={handleSubmit}
            type="button"
          >
            {loading ? (
              <Trans t={t} i18nKey="blockImport.importing" />
            ) : (
              <Trans t={t} i18nKey="blockImport.import" />
            )}
          </button>
        </div>
      </div>
    </section>
  )
}
