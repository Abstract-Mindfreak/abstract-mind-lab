import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { Trans, useTranslation } from 'react-i18next'

type JsonFragmentNodeData = {
  kind: 'root' | 'object' | 'array' | 'value'
  label: string
  path: string
  valuePreview?: string
  childrenCount?: number
  itemsCount?: number
}

export type JsonFragmentNodeType = Node<JsonFragmentNodeData, 'jsonFragment'>

export function JsonFragmentNode({ data }: NodeProps<JsonFragmentNodeType>) {
  const { t } = useTranslation()

  return (
    <div className="min-w-[220px] max-w-[300px] rounded-2xl border border-violet-400/25 bg-violet-400/10 px-4 py-3 shadow-lg shadow-violet-950/20">
      <Handle position={Position.Left} type="target" />
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.2em] text-violet-200/80">
          {data.kind === 'root'
            ? t('graph.rootNode')
            : data.kind === 'object'
              ? t('graph.objectNode')
              : data.kind === 'array'
                ? t('graph.arrayNode')
                : t('graph.valueNode')}
        </div>
        <div className="truncate text-sm font-semibold text-slate-50">{data.label}</div>
        <div className="truncate text-xs text-slate-400">
          <Trans t={t} i18nKey="graph.pathLabel" values={{ path: data.path }} />
        </div>
        {typeof data.childrenCount === 'number' ? (
          <div className="text-xs text-violet-100/80">
            <Trans t={t} i18nKey="graph.childrenCount" values={{ count: data.childrenCount }} />
          </div>
        ) : null}
        {typeof data.itemsCount === 'number' ? (
          <div className="text-xs text-violet-100/80">
            <Trans t={t} i18nKey="graph.itemsCount" values={{ count: data.itemsCount }} />
          </div>
        ) : null}
        {data.valuePreview ? (
          <div className="rounded-xl border border-violet-300/15 bg-slate-950/45 px-3 py-2 text-xs text-slate-300">
            <Trans t={t} i18nKey="graph.valuePreview" values={{ value: data.valuePreview }} />
          </div>
        ) : null}
      </div>
      <Handle position={Position.Right} type="source" />
    </div>
  )
}
