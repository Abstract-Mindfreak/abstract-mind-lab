import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type NodeTypes,
} from '@xyflow/react'
import { useEffect, useMemo } from 'react'
import { GroupSummaryNode } from '../graph/GroupSummaryNode'
import { PromptFlowNode } from '../graph/PromptFlowNode'
import { buildPromptGraph } from '../../lib/buildPromptGraph'
import { useAppStore } from '../../store/useAppStore'
import type { PanelProps } from './types'

const nodeTypes: NodeTypes = {
  groupSummary: GroupSummaryNode,
  promptBlock: PromptFlowNode,
}

export function GraphCanvasPanel({ node }: PanelProps) {
  return (
    <section className="panel-shell">
      <div className="panel-card flex h-full min-h-[320px] flex-col gap-4">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.24em] text-emerald-300/80">{node.getName()}</p>
          <h2 className="text-xl font-semibold text-slate-50">Graph staging area</h2>
          <p className="text-sm text-slate-300">
            Graph derives directly from the current Zustand dataset, search query, selection, and
            optional grouping key path.
          </p>
        </header>

        <div className="min-h-[520px] flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/75">
          <ReactFlowProvider>
            <PromptGraph />
          </ReactFlowProvider>
        </div>
      </div>
    </section>
  )
}

function PromptGraph() {
  const promptBlocks = useAppStore((state) => state.promptBlocks)
  const selectedPromptId = useAppStore((state) => state.selectedPromptId)
  const searchQuery = useAppStore((state) => state.searchQuery)
  const groupByPath = useAppStore((state) => state.groupByPath)
  const setSelectedPromptId = useAppStore((state) => state.setSelectedPromptId)

  const graph = useMemo(
    () =>
      buildPromptGraph({
        blocks: promptBlocks,
        selectedPromptId,
        searchQuery,
        groupByPath,
      }),
    [groupByPath, promptBlocks, searchQuery, selectedPromptId],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges)

  useEffect(() => {
    setNodes(graph.nodes)
    setEdges(graph.edges)
  }, [graph.edges, graph.nodes, setEdges, setNodes])

  return (
    <ReactFlow
      edges={edges}
      fitView
      maxZoom={1.5}
      minZoom={0.2}
      nodeTypes={nodeTypes}
      nodes={nodes}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, clickedNode) => {
        if (clickedNode.id.startsWith('block:')) {
          setSelectedPromptId(clickedNode.id.replace('block:', ''))
        }
      }}
      onNodesChange={onNodesChange}
      onlyRenderVisibleElements
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#1e293b" gap={24} size={1} />
      <MiniMap
        bgColor="#020617"
        maskColor="rgba(15, 23, 42, 0.65)"
        nodeColor={(currentNode) =>
          currentNode.type === 'groupSummary' ? 'rgba(52, 211, 153, 0.7)' : 'rgba(56, 189, 248, 0.7)'
        }
        pannable
        zoomable
      />
      <Controls position="bottom-right" showInteractive={false} />
    </ReactFlow>
  )
}
