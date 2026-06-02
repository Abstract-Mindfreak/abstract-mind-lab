import { Handle, NodeResizer, Position, type Node, type NodeProps } from '@xyflow/react'
import { Trans, useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'

type PromptFlowNodeData = {
  blockId: string
  displayName: string
  fileName: string
  mmssType: string | null
  relativePath: string
  keyPreview: string[]
  selected: boolean
}

export type PromptFlowNodeType = Node<PromptFlowNodeData, 'promptBlock'>

export function PromptFlowNode({ data }: NodeProps<PromptFlowNodeType>) {
  const { t } = useTranslation()
  const openPromptInNewTab = useAppStore((state) => state.openPromptInNewTab)
  const openPromptInPreview = useAppStore((state) => state.openPromptInPreview)

  return (
    <div
      className={`min-w-[240px] max-w-[280px] rounded-2xl border px-4 py-3 shadow-lg transition ${
        data.selected
          ? 'border-cyan-400 bg-cyan-400/12 shadow-cyan-950/40'
          : 'border-slate-700 bg-slate-900/95 shadow-slate-950/40'
      }`}
      onMouseDown={(event) => {
        if (event.button === 1) {
          event.preventDefault()
          openPromptInNewTab(data.blockId)
        }
      }}
    >
      <NodeResizer color="#22d3ee" isVisible={data.selected} minHeight={120} minWidth={220} />
      <Handle position={Position.Left} type="target" />
      <div className="space-y-2">
        <div className="truncate text-sm font-semibold text-slate-50">{data.displayName}</div>
        <div className="truncate text-xs text-slate-400">{data.fileName}</div>
        <div className="truncate text-[11px] text-slate-500">{data.relativePath}</div>
        {data.mmssType ? (
          <div className="inline-flex max-w-full rounded-full border border-violet-400/25 bg-violet-400/10 px-2 py-1 text-[11px] text-violet-100/85">
            <span className="truncate">{data.mmssType}</span>
          </div>
        ) : null}
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
          <Trans t={t} i18nKey="graph.topLevelKeys" />
        </div>
        <div className="flex flex-wrap gap-1">
          {data.keyPreview.slice(0, 6).map((key: string) => (
            <span
              className="rounded-full border border-slate-700 bg-slate-800/80 px-2 py-1 text-[11px] text-slate-200"
              key={key}
            >
              {key}
            </span>
          ))}
          {data.keyPreview.length === 0 ? (
            <span className="text-[11px] text-slate-500">
              <Trans t={t} i18nKey="graph.noEnumerableKeys" />
            </span>
          ) : null}
        </div>
        <button
          className="nodrag nopan mt-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-400/15"
          onClick={(event) => {
            event.stopPropagation()
            openPromptInPreview(data.blockId)
          }}
          type="button"
        >
          <Trans t={t} i18nKey="graph.openFileGraph" />
        </button>
        <button
          className="nodrag nopan rounded-xl border border-violet-400/30 bg-violet-400/10 px-3 py-2 text-xs font-medium text-violet-100 transition hover:border-violet-300 hover:bg-violet-400/15"
          onClick={(event) => {
            event.stopPropagation()
            openPromptInNewTab(data.blockId)
          }}
          type="button"
        >
          <Trans t={t} i18nKey="graph.openInNewTab" />
        </button>
      </div>
      <Handle position={Position.Right} type="source" />
    </div>
  )
}
