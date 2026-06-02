import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'
import type { PanelProps } from './types'

export function TerminalPanel({ node }: PanelProps) {
  const { t } = useTranslation()
  const systemLogs = useAppStore((state) => state.systemLogs)

  return (
    <section className="panel-shell">
      <div className="panel-card flex h-full min-h-[220px] flex-col gap-4">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.24em] text-teal-300/80">{node.getName()}</p>
          <h2 className="text-xl font-semibold text-slate-50">{t('terminal.title')}</h2>
          <p className="text-sm text-slate-400">{t('terminal.description')}</p>
        </header>

        <div className="flex-1 overflow-auto rounded-2xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-xs text-slate-300">
          {systemLogs.length === 0 ? (
            <div className="text-slate-500">{t('terminal.empty')}</div>
          ) : (
            <div className="space-y-3">
              {systemLogs.map((entry) => (
                <div className="border-b border-slate-800/80 pb-3 last:border-b-0 last:pb-0" key={entry.id}>
                  <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    {new Date(entry.timestamp).toLocaleString('ru-RU')}
                  </div>
                  <div>{t(entry.message.key, entry.message.values)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
