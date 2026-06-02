import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { Trans, useTranslation } from 'react-i18next'

type GroupSummaryNodeData = {
  label: string
  count: number
  activePath: string
}

export type GroupSummaryNodeType = Node<GroupSummaryNodeData, 'groupSummary'>

export function GroupSummaryNode({ data }: NodeProps<GroupSummaryNodeType>) {
  const { t } = useTranslation()

  return (
    <div className="min-w-[220px] rounded-2xl border border-emerald-400/35 bg-emerald-400/10 px-4 py-3 shadow-lg shadow-emerald-950/25">
      <Handle position={Position.Right} type="source" />
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-200/80">
          {data.activePath || t('graph.dataset')}
        </div>
        <div className="truncate text-sm font-semibold text-slate-50">{data.label}</div>
        <div className="text-xs text-emerald-100/80">
          <Trans t={t} i18nKey="graph.connectedBlocks" values={{ count: data.count }} />
        </div>
      </div>
    </div>
  )
}
