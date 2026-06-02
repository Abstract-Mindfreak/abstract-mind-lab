import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'
import type { PanelProps } from './types'

export function WorkspaceSettingsPanel({ node }: PanelProps) {
  const { t } = useTranslation()
  const fontScale = useAppStore((state) => state.fontScale)
  const setFontScale = useAppStore((state) => state.setFontScale)
  const setShowEdgeLabels = useAppStore((state) => state.setShowEdgeLabels)
  const setShowMiniMap = useAppStore((state) => state.setShowMiniMap)
  const setUiTheme = useAppStore((state) => state.setUiTheme)
  const showEdgeLabels = useAppStore((state) => state.showEdgeLabels)
  const showMiniMap = useAppStore((state) => state.showMiniMap)
  const uiTheme = useAppStore((state) => state.uiTheme)

  return (
    <section className="panel-shell">
      <div className="panel-card space-y-5">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.24em] text-fuchsia-300/80">{node.getName()}</p>
          <h2 className="text-xl font-semibold text-slate-50">{t('settings.title')}</h2>
          <p className="text-sm text-slate-400">{t('settings.description')}</p>
        </header>

        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
            <span>{t('settings.showMiniMap')}</span>
            <input checked={showMiniMap} onChange={(event) => setShowMiniMap(event.target.checked)} type="checkbox" />
          </label>
          <label className="flex items-center justify-between gap-4 text-sm text-slate-200">
            <span>{t('settings.showEdgeLabels')}</span>
            <input checked={showEdgeLabels} onChange={(event) => setShowEdgeLabels(event.target.checked)} type="checkbox" />
          </label>
        </div>

        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{t('settings.fontSize')}</div>
          <select
            className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-100"
            onChange={(event) => setFontScale(event.target.value as 'x-small' | 'medium' | 'large')}
            value={fontScale}
          >
            <option value="x-small">{t('settings.fontXSmall')}</option>
            <option value="medium">{t('settings.fontMedium')}</option>
            <option value="large">{t('settings.fontLarge')}</option>
          </select>
        </div>

        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{t('settings.theme')}</div>
          <select
            className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-100"
            onChange={(event) => setUiTheme(event.target.value as 'dark' | 'light' | 'rounded')}
            value={uiTheme}
          >
            <option value="dark">{t('settings.themeDark')}</option>
            <option value="light">{t('settings.themeLight')}</option>
            <option value="rounded">{t('settings.themeRounded')}</option>
          </select>
        </div>
      </div>
    </section>
  )
}
