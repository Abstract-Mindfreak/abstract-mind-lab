import { Trans, useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'
import type { PanelProps } from './types'

export function DiffAnalyticsPanel({ node }: PanelProps) {
  const { t } = useTranslation()
  const statusMessage = useAppStore((state) => state.statusMessage)
  const diffSelection = useAppStore((state) => state.diffSelection)

  return (
    <section className="panel-shell">
      <div className="panel-card space-y-4">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.24em] text-amber-300/80">{node.getName()}</p>
          <h2 className="text-xl font-semibold text-slate-50">
            <Trans t={t} i18nKey="diffAnalytics.title" />
          </h2>
        </header>

        <div className="flex flex-wrap gap-2 text-xs">
          <LegendChip className="border-emerald-400/30 bg-emerald-400/10 text-emerald-200" i18nKey="diffAnalytics.legendAdded" />
          <LegendChip className="border-rose-400/30 bg-rose-400/10 text-rose-200" i18nKey="diffAnalytics.legendRemoved" />
          <LegendChip className="border-amber-400/30 bg-amber-400/10 text-amber-200" i18nKey="diffAnalytics.legendChanged" />
          <LegendChip className="border-slate-700 bg-slate-900/80 text-slate-300" i18nKey="diffAnalytics.legendUnchanged" />
        </div>

        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-slate-300">
          <Trans t={t} i18nKey={statusMessage.key} values={statusMessage.values} />
        </div>

        {diffSelection ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
              <div className="font-medium text-slate-100">
                <Trans
                  t={t}
                  i18nKey="diffAnalytics.selectionTitle"
                  values={{
                    source: diffSelection.sourceLabel,
                    target: diffSelection.targetLabel,
                  }}
                />
              </div>
              <div className="mt-1 text-xs text-slate-500">
                <Trans
                  t={t}
                  i18nKey="diffAnalytics.selectionSubtitle"
                  values={{
                    sourcePath: diffSelection.sourcePath,
                    targetPath: diffSelection.targetPath,
                  }}
                />
              </div>
            </div>

            {diffSelection.delta ? (
              <DiffTree delta={diffSelection.delta} path="$" />
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
                <Trans t={t} i18nKey="diffAnalytics.equal" />
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function DiffTree({ delta, path }: { delta: unknown; path: string }) {
  const { t } = useTranslation()

  if (Array.isArray(delta)) {
    return <DiffLeaf delta={delta} path={path} />
  }

  if (!delta || typeof delta !== 'object') {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-300">
        {JSON.stringify(delta, null, 2)}
      </div>
    )
  }

  const entries = Object.entries(delta as Record<string, unknown>)
  const isArrayDelta = (delta as Record<string, unknown>)._t === 'a'

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
          <Trans t={t} i18nKey="diffAnalytics.key" values={{ key: path }} />
        </div>
        {isArrayDelta ? (
          <div className="mt-1 text-xs text-amber-300">
            <Trans t={t} i18nKey="diffAnalytics.arrayDelta" />
          </div>
        ) : null}
      </div>
      <div className="space-y-2 border-l border-slate-800 pl-4">
        {entries
          .filter(([key]) => key !== '_t')
          .map(([key, childDelta]) => (
            <DiffTree key={`${path}.${key}`} delta={childDelta} path={`${path}.${key}`} />
          ))}
      </div>
    </div>
  )
}

function DiffLeaf({ delta, path }: { delta: unknown[]; path: string }) {
  const { t } = useTranslation()

  if (delta.length === 1) {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-xs text-emerald-100">
        <div className="mb-2 uppercase tracking-[0.2em] text-emerald-300">
          <Trans t={t} i18nKey="diffAnalytics.addedValue" />
        </div>
        <div className="mb-2 text-slate-200">
          <Trans t={t} i18nKey="diffAnalytics.key" values={{ key: path }} />
        </div>
        <pre className="overflow-auto whitespace-pre-wrap">{JSON.stringify(delta[0], null, 2)}</pre>
      </div>
    )
  }

  if (delta.length === 2) {
    return (
      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-xs text-amber-100">
        <div className="mb-2 text-slate-200">
          <Trans t={t} i18nKey="diffAnalytics.key" values={{ key: path }} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="mb-1 uppercase tracking-[0.2em] text-amber-300">
              <Trans t={t} i18nKey="diffAnalytics.fromValue" />
            </div>
            <pre className="overflow-auto whitespace-pre-wrap">{JSON.stringify(delta[0], null, 2)}</pre>
          </div>
          <div>
            <div className="mb-1 uppercase tracking-[0.2em] text-amber-300">
              <Trans t={t} i18nKey="diffAnalytics.toValue" />
            </div>
            <pre className="overflow-auto whitespace-pre-wrap">{JSON.stringify(delta[1], null, 2)}</pre>
          </div>
        </div>
      </div>
    )
  }

  if (delta.length === 3 && delta[1] === 0 && delta[2] === 0) {
    return (
      <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-xs text-rose-100">
        <div className="mb-2 uppercase tracking-[0.2em] text-rose-300">
          <Trans t={t} i18nKey="diffAnalytics.removedValue" />
        </div>
        <div className="mb-2 text-slate-200">
          <Trans t={t} i18nKey="diffAnalytics.key" values={{ key: path }} />
        </div>
        <pre className="overflow-auto whitespace-pre-wrap">{JSON.stringify(delta[0], null, 2)}</pre>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4 text-xs text-slate-300">
      <div className="mb-2 uppercase tracking-[0.2em] text-slate-500">
        <Trans t={t} i18nKey="diffAnalytics.movedOrSpecial" />
      </div>
      <div className="mb-2">
        <Trans t={t} i18nKey="diffAnalytics.key" values={{ key: path }} />
      </div>
      <pre className="overflow-auto whitespace-pre-wrap">{JSON.stringify(delta, null, 2)}</pre>
    </div>
  )
}

function LegendChip({ className, i18nKey }: { className: string; i18nKey: string }) {
  const { t } = useTranslation()

  return (
    <div className={`rounded-full border px-3 py-1 ${className}`}>
      <Trans t={t} i18nKey={i18nKey} />
    </div>
  )
}
