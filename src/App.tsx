import { Layout, Model, TabNode } from 'flexlayout-react'
import { useState } from 'react'
import { panelRegistry } from './components/panels/panelRegistry'
import { DEFAULT_LAYOUT } from './layout/defaultLayout'

export default function App() {
  const [model] = useState(() => Model.fromJson(DEFAULT_LAYOUT))

  const factory = (node: TabNode) => {
    const component = node.getComponent() ?? ''
    const Panel = panelRegistry[component]

    if (!Panel) {
      return <div className="p-4 text-sm text-slate-300">Unknown panel: {component}</div>
    }

    return <Panel node={node} />
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      <Layout model={model} factory={factory} />
    </main>
  )
}
