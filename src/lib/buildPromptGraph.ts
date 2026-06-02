import type { Edge, Node } from '@xyflow/react'
import { buildFocusedFileGraph } from './buildFocusedFileGraph'
import { getValueByPath, groupPromptBlocks, searchPromptBlocks, type PromptBlock } from './promptIndex'

type BuildPromptGraphArgs = {
  blocks: PromptBlock[]
  selectedPromptId: string | null
  focusedFileId: string | null
  searchQuery: string
  groupByPath: string
}

export function buildPromptGraph({
  blocks,
  selectedPromptId,
  focusedFileId,
  searchQuery,
  groupByPath,
}: BuildPromptGraphArgs): { nodes: Node[]; edges: Edge[] } {
  if (focusedFileId) {
    const focusedBlock = blocks.find((block) => block.id === focusedFileId)

    if (focusedBlock) {
      return buildFocusedFileGraph({ block: focusedBlock })
    }
  }

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
    return buildGroupedGraph(filteredBlocks, selectedPromptId, groupByPath)
  }

  return buildUngroupedGraph(filteredBlocks.slice(0, 36), selectedPromptId)
}

function buildGroupedGraph(
  blocks: PromptBlock[],
  selectedPromptId: string | null,
  groupByPath: string,
): { nodes: Node[]; edges: Edge[] } {
  const groups = [...groupPromptBlocks(blocks, groupByPath).entries()].slice(0, 12)
  const nodes: Node[] = []
  const edges: Edge[] = []

  groups.forEach(([label, groupBlocks], groupIndex) => {
    const groupNodeId = `group:${label}:${groupIndex}`

    nodes.push({
      id: groupNodeId,
      type: 'groupSummary',
      position: { x: 0, y: groupIndex * 220 },
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
        position: {
          x: 320 + blockIndex * 300,
          y: groupIndex * 220,
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
        label: formatEdgeLabel(getValueByPath(block.data, groupByPath)),
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
  selectedPromptId: string | null,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = blocks.map((block, index) => ({
    id: `block:${block.id}`,
    type: 'promptBlock',
    position: {
      x: (index % 4) * 320,
      y: Math.floor(index / 4) * 220,
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
