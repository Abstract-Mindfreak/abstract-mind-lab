import { Trans, useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'
import type { PanelProps } from './types'

export function JsonInspectorPanel({ node }: PanelProps) {
  const { t } = useTranslation()
  const selectedBlockContent = useAppStore((state) => state.selectedBlockContent)

  if (!selectedBlockContent) {
    return (
      <section className="panel-shell">
        <div className="panel-card space-y-4">
          <header className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] text-sky-300/80">{node.getName()}</p>
            <h2 className="text-xl font-semibold text-slate-50">
              <Trans t={t} i18nKey="jsonInspector.title" />
            </h2>
          </header>

          <div className="flex items-center justify-center h-64 bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-500 text-xs font-mono p-4">
            <Trans t={t} i18nKey="jsonInspector.empty" />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="panel-shell">
      <div className="panel-card space-y-4">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.24em] text-sky-300/80">{node.getName()}</p>
          <h2 className="text-xl font-semibold text-slate-50">
            <Trans t={t} i18nKey="jsonInspector.title" />
          </h2>
        </header>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
          <div className="font-medium text-slate-100">{selectedBlockContent.slug}</div>
          <div className="text-xs text-slate-500">
            {selectedBlockContent.block_type} • Layer {selectedBlockContent.layer}
          </div>
        </div>

        <pre className="overflow-auto h-96 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-emerald-400 font-mono whitespace-pre-wrap leading-relaxed">
          {JSON.stringify(selectedBlockContent.content, null, 2)}
        </pre>
      </div>
    </section>
  )
}
