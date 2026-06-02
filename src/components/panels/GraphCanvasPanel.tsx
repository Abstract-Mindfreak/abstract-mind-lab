import {
  applyNodeChanges,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useOnSelectionChange,
  SelectionMode,
  type NodeChange,
  type Edge,
  type Node,
  type NodeTypes,
} from '@xyflow/react'
import { useCallback, useEffect, useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
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
  const promptBlocks = useAppStore((state) => state.promptBlocks)
  const graphNodeLayouts = useAppStore((state) => state.graphNodeLayouts)
  const selectedPromptId = useAppStore((state) => state.selectedPromptId)
  const searchQuery = useAppStore((state) => state.searchQuery)
  const groupByPath = useAppStore((state) => state.groupByPath)
  const openPromptInNewTab = useAppStore((state) => state.openPromptInNewTab)
  const openPromptInPreview = useAppStore((state) => state.openPromptInPreview)
  const setSelectedPromptId = useAppStore((state) => state.setSelectedPromptId)
  const showEdgeLabels = useAppStore((state) => state.showEdgeLabels)
  const showMiniMap = useAppStore((state) => state.showMiniMap)
  const upsertGraphNodeLayouts = useAppStore((state) => state.upsertGraphNodeLayouts)
  const updateDiffFromGraphSelection = useAppStore((state) => state.updateDiffFromGraphSelection)

  const graph = useMemo(
    () =>
      buildPromptGraph({
        blocks: promptBlocks,
        graphNodeLayouts,
        selectedPromptId,
        searchQuery,
        groupByPath,
        showEdgeLabels,
      }),
    [graphNodeLayouts, groupByPath, promptBlocks, searchQuery, selectedPromptId, showEdgeLabels],
  )

  const [nodes, setNodes] = useNodesState(graph.nodes)
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

  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      setNodes((currentNodes) => applyNodeChanges(changes, currentNodes))

      const layoutUpdates = changes.reduce<Record<string, Partial<{ width?: number; height?: number; x: number; y: number }>>>(
        (accumulator, change) => {
          if (change.type === 'position' && change.position) {
            accumulator[change.id] = {
              ...accumulator[change.id],
              x: change.position.x,
              y: change.position.y,
            }
          }

          if (change.type === 'dimensions' && change.dimensions) {
            accumulator[change.id] = {
              ...accumulator[change.id],
              width: change.dimensions.width,
              height: change.dimensions.height,
            }
          }

          return accumulator
        },
        {},
      )

      if (Object.keys(layoutUpdates).length > 0) {
        upsertGraphNodeLayouts(layoutUpdates)
      }
    },
    [setNodes, upsertGraphNodeLayouts],
  )

  return (
    <ReactFlow
      edges={edges}
      fitView
      maxZoom={1.5}
      minZoom={0.2}
      multiSelectionKeyCode={['Meta', 'Control', 'Shift']}
      nodeTypes={nodeTypes}
      nodes={nodes}
      onNodeDoubleClick={(_, clickedNode) => {
        const blockId = clickedNode.data?.blockId

        if (typeof blockId === 'string') {
          openPromptInNewTab(blockId)
        }
      }}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, clickedNode) => {
        if (clickedNode.id.startsWith('block:')) {
          const blockId = clickedNode.id.replace('block:', '')
          setSelectedPromptId(blockId)
          openPromptInPreview(blockId)
        }
      }}
      onNodeContextMenu={(event, clickedNode) => {
        const blockId = clickedNode.data?.blockId

        if (typeof blockId === 'string') {
          event.preventDefault()
          openPromptInNewTab(blockId)
        }
      }}
      onNodesChange={onNodesChange}
      onlyRenderVisibleElements
      panOnDrag={[1, 2]}
      proOptions={{ hideAttribution: true }}
      selectionMode={SelectionMode.Partial}
      selectionOnDrag
    >
      <Background color="#1e293b" gap={24} size={1} />
      {showMiniMap ? (
        <MiniMap
          bgColor="#020617"
          maskColor="rgba(15, 23, 42, 0.65)"
          nodeColor={(currentNode) =>
            currentNode.type === 'groupSummary' ? 'rgba(52, 211, 153, 0.7)' : 'rgba(56, 189, 248, 0.7)'
          }
          pannable
          zoomable
        />
      ) : null}
      <Controls position="bottom-right" showInteractive={false} />
    </ReactFlow>
  )
}
