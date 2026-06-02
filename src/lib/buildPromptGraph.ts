import type { Edge, Node } from '@xyflow/react'
import { getValueByPath, groupPromptBlocks, searchPromptBlocks, type PromptBlock } from './promptIndex'

type BuildPromptGraphArgs = {
  blocks: PromptBlock[]
  graphNodeLayouts: Record<string, { width?: number; height?: number; x: number; y: number }>
  selectedPromptId: string | null
  searchQuery: string
  groupByPath: string
  showEdgeLabels: boolean
}

export function buildPromptGraph({
  blocks,
  graphNodeLayouts,
  selectedPromptId,
  searchQuery,
  groupByPath,
  showEdgeLabels,
}: BuildPromptGraphArgs): { nodes: Node[]; edges: Edge[] } {
  const filteredBlocks = searchPromptBlocks(blocks, searchQuery)

  if (filteredBlocks.length === 0) {
    return {
      nodes: [
        {
          id: 'empty',
          type: 'groupSummary',
          position: { x: 0, y: 0 },
          data: {
            label: 'No blocks to display',
            count: 0,
            activePath: groupByPath || 'dataset',
          },
          draggable: false,
          selectable: false,
        },
      ],
      edges: [],
    }
  }

  if (groupByPath.trim()) {
    return buildGroupedGraph(filteredBlocks, graphNodeLayouts, selectedPromptId, groupByPath, showEdgeLabels)
  }

  return buildUngroupedGraph(filteredBlocks.slice(0, 36), graphNodeLayouts, selectedPromptId)
}

function buildGroupedGraph(
  blocks: PromptBlock[],
  graphNodeLayouts: Record<string, { width?: number; height?: number; x: number; y: number }>,
  selectedPromptId: string | null,
  groupByPath: string,
  showEdgeLabels: boolean,
): { nodes: Node[]; edges: Edge[] } {
  const groups = [...groupPromptBlocks(blocks, groupByPath).entries()].slice(0, 12)
  const nodes: Node[] = []
  const edges: Edge[] = []

  groups.forEach(([label, groupBlocks], groupIndex) => {
    const groupNodeId = `group:${label}:${groupIndex}`

    nodes.push({
      id: groupNodeId,
      type: 'groupSummary',
      position: graphNodeLayouts[groupNodeId] ?? { x: 0, y: groupIndex * 220 },
      style: {
        width: graphNodeLayouts[groupNodeId]?.width,
        height: graphNodeLayouts[groupNodeId]?.height,
      },
      data: {
        label,
        count: groupBlocks.length,
        activePath: groupByPath,
      },
      draggable: false,
    })

    groupBlocks.slice(0, 6).forEach((block, blockIndex) => {
      const blockNodeId = `block:${block.id}`

      nodes.push({
        id: blockNodeId,
        type: 'promptBlock',
        position: graphNodeLayouts[blockNodeId] ?? {
          x: 320 + blockIndex * 300,
          y: groupIndex * 220,
        },
        style: {
          width: graphNodeLayouts[blockNodeId]?.width,
          height: graphNodeLayouts[blockNodeId]?.height,
        },
        data: {
          blockId: block.id,
          displayName: block.displayName,
          fileName: block.fileName,
          mmssType: block.mmssType,
          relativePath: block.relativePath,
          keyPreview: block.topLevelKeys,
          selected: block.id === selectedPromptId,
        },
      })

      edges.push({
        id: `${groupNodeId}->${blockNodeId}`,
        source: groupNodeId,
        target: blockNodeId,
        type: 'smoothstep',
        animated: block.id === selectedPromptId,
        label: showEdgeLabels ? formatEdgeLabel(getValueByPath(block.data, groupByPath)) : undefined,
        data: {
          sourcePromptId: undefined,
          targetPromptId: block.id,
        },
      })
    })
  })

  return { nodes, edges }
}

function buildUngroupedGraph(
  blocks: PromptBlock[],
  graphNodeLayouts: Record<string, { width?: number; height?: number; x: number; y: number }>,
  selectedPromptId: string | null,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = blocks.map((block, index) => ({
    id: `block:${block.id}`,
    type: 'promptBlock',
    position: graphNodeLayouts[`block:${block.id}`] ?? {
      x: (index % 4) * 320,
      y: Math.floor(index / 4) * 220,
    },
    style: {
      width: graphNodeLayouts[`block:${block.id}`]?.width,
      height: graphNodeLayouts[`block:${block.id}`]?.height,
    },
    data: {
      blockId: block.id,
      displayName: block.displayName,
      fileName: block.fileName,
      mmssType: block.mmssType,
      relativePath: block.relativePath,
      keyPreview: block.topLevelKeys,
      selected: block.id === selectedPromptId,
    },
  }))

  const edges: Edge[] = blocks.slice(1).map((block, index) => ({
    id: `edge:${blocks[index].id}->${block.id}`,
    source: `block:${blocks[index].id}`,
    target: `block:${block.id}`,
    type: 'smoothstep',
    animated: blocks[index].id === selectedPromptId || block.id === selectedPromptId,
    data: {
      sourcePromptId: blocks[index].id,
      targetPromptId: block.id,
    },
  }))

  return { nodes, edges }
}

function formatEdgeLabel(value: unknown) {
  if (value === undefined) {
    return 'undefined'
  }

  if (value === null) {
    return 'null'
  }

  if (typeof value === 'object') {
    return 'object'
  }

  return String(value)
}
