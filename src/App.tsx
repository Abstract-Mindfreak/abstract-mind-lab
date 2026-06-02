import { Layout, Model, TabNode, type ITabRenderValues } from 'flexlayout-react'
import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { panelRegistry } from './components/panels/panelRegistry'
import { buildDefaultLayout } from './layout/defaultLayout'

export default function App() {
  const { t } = useTranslation()
  const model = useMemo(() => Model.fromJson(buildDefaultLayout(t)), [t])

  const factory = (node: TabNode) => {
    const component = node.getComponent() ?? ''
    const Panel = panelRegistry[component]

    if (!Panel) {
      return (
        <div className="p-4 text-sm text-slate-300">
          <Trans i18nKey="app.unknownPanel" values={{ component }} />
        </div>
      )
    }

    return <Panel node={node} />
  }

  const onRenderTab = (node: TabNode, renderValues: ITabRenderValues) => {
    const component = node.getComponent() ?? ''
    const accentClass = tabAccentClassByComponent[component]

    if (!accentClass) {
      return
    }

    renderValues.content = (
      <span className={`aml-tab-accent ${accentClass}`}>{renderValues.content}</span>
    )
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      <Layout model={model} factory={factory} onRenderTab={onRenderTab} />
    </main>
  )
}

const tabAccentClassByComponent: Record<string, string> = {
  'prompt-list': 'aml-tab-accent-prompt',
  'graph-canvas': 'aml-tab-accent-graph',
  'json-inspector': 'aml-tab-accent-json',
  'diff-analytics': 'aml-tab-accent-diff',
}
