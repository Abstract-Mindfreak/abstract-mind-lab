import { useAppStore } from '../../store/useAppStore'
import type { PanelProps } from './types'

export function DiffAnalyticsPanel({ node }: PanelProps) {
  const statusMessage = useAppStore((state) => state.statusMessage)

  return (
    <section className="panel-shell">
      <div className="panel-card space-y-4">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.24em] text-amber-300/80">{node.getName()}</p>
          <h2 className="text-xl font-semibold text-slate-50">Diff analytics</h2>
        </header>

        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-slate-300">
          {statusMessage}
        </div>
      </div>
    </section>
  )
}
