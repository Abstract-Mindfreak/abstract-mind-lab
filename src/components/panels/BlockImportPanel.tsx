import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import type { PanelProps } from './types'
import { useAppStore } from '../../store/useAppStore'

export function BlockImportPanel({ node }: PanelProps) {
  const { t } = useTranslation()
  const triggerTreeRefresh = useAppStore((state) => state.triggerTreeRefresh)
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
  const [importProgress, setImportProgress] = useState<string | null>(null)

  const API_URL = 'http://localhost:8005/api/music-blocks/'

  const submitPayload = async (parsedData: any): Promise<boolean> => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedData),
      })
      return response.ok
    } catch (err) {
      return false
    }
  }

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

  const handleManualSubmit = async () => {
    if (!parsedData) {
      setError('No valid JSON to import')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const payload = {
        block_type: formData.block_type || 'Unknown',
        layer: formData.layer,
        slug: formData.slug || `block_${Date.now()}`,
        name: formData.name || null,
        content: parsedData,
      }

      const success = await submitPayload(payload)
      if (success) {
        setJsonInput('')
        setParsedData(null)
        setFormData({ block_type: '', layer: 1, slug: '', name: '' })
        triggerTreeRefresh()
      } else {
        setError('Backend server rejected the payload format.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import block')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setError(null)
    let successCount = 0
    setImportProgress(`Processing 0 / ${files.length} files...`)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const text = await file.text()
      try {
        const parsed = JSON.parse(text)
        
        // Auto-infer metadata blocks if fields exist inside file keys
        if (!parsed.block_type && parsed.rhythm_patterns) parsed.block_type = 'Rhythm'
        if (!parsed.slug && parsed.meta_id) parsed.slug = parsed.meta_id

        const ok = await submitPayload(parsed)
        if (ok) successCount++
      } catch (err) {
        // Continue processing remaining files even if one fails
      }
      setImportProgress(`Processing ${i + 1} / ${files.length} files...`)
    }

    setImportProgress(`Successfully imported ${successCount} out of ${files.length} configuration files.`)
    triggerTreeRefresh()
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
          <div className="border-2 border-dashed border-slate-700 p-6 rounded-lg text-center bg-slate-950">
            <label className="block text-sm font-medium mb-2 cursor-pointer text-cyan-400 hover:underline">
              <Trans t={t} i18nKey="blockImport.fileUploadLabel" />
              <input 
                type="file" 
                multiple 
                accept=".json" 
                className="hidden" 
                onChange={handleFileChange} 
              />
            </label>
            <span className="text-xs text-slate-500">
              <Trans t={t} i18nKey="blockImport.fileUploadHint" />
            </span>
          </div>

          {importProgress && (
            <div className="text-xs p-2 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
              {importProgress}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              <Trans t={t} i18nKey="blockImport.manualInputLabel" />
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
            onClick={handleManualSubmit}
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
