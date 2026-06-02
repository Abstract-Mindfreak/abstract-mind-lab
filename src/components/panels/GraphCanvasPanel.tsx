import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useOnSelectionChange,
  type Edge,
  type Node,
  type NodeTypes,
} from '@xyflow/react'
import { useCallback, useEffect, useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { GroupSummaryNode } from '../graph/GroupSummaryNode'
import { JsonFragmentNode } from '../graph/JsonFragmentNode'
import { PromptFlowNode } from '../graph/PromptFlowNode'
import { buildPromptGraph } from '../../lib/buildPromptGraph'
import { useAppStore } from '../../store/useAppStore'
import type { PanelProps } from './types'

const nodeTypes: NodeTypes = {
  groupSummary: GroupSummaryNode,
  jsonFragment: JsonFragmentNode,
  promptBlock: PromptFlowNode,
}

export function GraphCanvasPanel({ node }: PanelProps) {
  const { t } = useTranslation()

  return (
    <section className="panel-shell">
      <div className="panel-card flex h-full min-h-[320px] flex-col gap-4">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.24em] text-emerald-300/80">{node.getName()}</p>
          <h2 className="text-xl font-semibold text-slate-50">
            <Trans t={t} i18nKey="graph.title" />
          </h2>
          <p className="text-sm text-slate-300">
            <Trans t={t} i18nKey="graph.description" />
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
  const { t } = useTranslation()
  const promptBlocks = useAppStore((state) => state.promptBlocks)
  const selectedPromptId = useAppStore((state) => state.selectedPromptId)
  const focusedFileId = useAppStore((state) => state.focusedFileId)
  const searchQuery = useAppStore((state) => state.searchQuery)
  const groupByPath = useAppStore((state) => state.groupByPath)
  const setSelectedPromptId = useAppStore((state) => state.setSelectedPromptId)
  const setFocusedFile = useAppStore((state) => state.setFocusedFile)
  const updateDiffFromGraphSelection = useAppStore((state) => state.updateDiffFromGraphSelection)

  const graph = useMemo(
    () =>
      buildPromptGraph({
        blocks: promptBlocks,
        selectedPromptId,
        focusedFileId,
        searchQuery,
        groupByPath,
      }),
    [focusedFileId, groupByPath, promptBlocks, searchQuery, selectedPromptId],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges)

  useEffect(() => {
    setNodes(graph.nodes)
    setEdges(graph.edges)
  }, [graph.edges, graph.nodes, setEdges, setNodes])

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: { nodes: Node[]; edges: Edge[] }) => {
      updateDiffFromGraphSelection({
        nodeIds: selectedNodes
          .map((selectedNode) => selectedNode.data?.blockId)
          .filter((id): id is string => typeof id === 'string'),
        edgePairs: selectedEdges.map((selectedEdge) => ({
          sourcePromptId:
            selectedEdge.data && typeof selectedEdge.data === 'object'
              ? (selectedEdge.data as { sourcePromptId?: string }).sourcePromptId
              : undefined,
          targetPromptId:
            selectedEdge.data && typeof selectedEdge.data === 'object'
              ? (selectedEdge.data as { targetPromptId?: string }).targetPromptId
              : undefined,
        })),
      })
    },
    [updateDiffFromGraphSelection],
  )

  useOnSelectionChange({
    onChange: onSelectionChange,
  })

  return (
    <ReactFlow
      edges={edges}
      fitView
      maxZoom={1.5}
      minZoom={0.2}
      multiSelectionKeyCode={['Meta', 'Control', 'Shift']}
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
      {focusedFileId ? (
        <Panel position="top-left">
          <button
            className="rounded-xl border border-cyan-400/35 bg-slate-950/90 px-4 py-2 text-sm font-medium text-cyan-200 shadow-lg transition hover:border-cyan-300 hover:bg-slate-900"
            onClick={() => setFocusedFile(null)}
            type="button"
          >
            <Trans t={t} i18nKey="graph.returnToDataset" />
          </button>
        </Panel>
      ) : null}
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
