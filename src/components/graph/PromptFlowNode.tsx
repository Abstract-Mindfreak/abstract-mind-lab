import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'

type PromptFlowNodeData = {
  fileName: string
  relativePath: string
  keyPreview: string[]
  selected: boolean
}

export type PromptFlowNodeType = Node<PromptFlowNodeData, 'promptBlock'>

export function PromptFlowNode({ data }: NodeProps<PromptFlowNodeType>) {
  return (
    <div
      className={`min-w-[240px] max-w-[280px] rounded-2xl border px-4 py-3 shadow-lg transition ${
        data.selected
          ? 'border-cyan-400 bg-cyan-400/12 shadow-cyan-950/40'
          : 'border-slate-700 bg-slate-900/95 shadow-slate-950/40'
      }`}
    >
      <Handle position={Position.Left} type="target" />
      <div className="space-y-2">
        <div className="truncate text-sm font-semibold text-slate-50">{data.fileName}</div>
        <div className="truncate text-xs text-slate-400">{data.relativePath}</div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Top level keys</div>
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
            <span className="text-[11px] text-slate-500">No enumerable keys</span>
          ) : null}
        </div>
      </div>
      <Handle position={Position.Right} type="source" />
    </div>
  )
}
