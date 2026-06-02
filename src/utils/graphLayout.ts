import dagre from 'dagre'
import { Position, type Edge, type Node } from '@xyflow/react'

type LayoutOptions = {
  columnsPerDepth?: number
  nodeHeight?: number
  nodeWidth?: number
  ranksep?: number
  rankdir?: 'TB' | 'LR'
}

type LayoutNodeData = {
  depth?: number
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  columnsPerDepth: 5,
  nodeHeight: 132,
  nodeWidth: 260,
  rankdir: 'TB',
  ranksep: 120,
}

export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {},
) {
  const config = { ...DEFAULT_OPTIONS, ...options }
  const graph = new dagre.graphlib.Graph()

  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({
    rankdir: config.rankdir,
    ranksep: config.ranksep,
    nodesep: 48,
    marginx: 24,
    marginy: 24,
  })

  nodes.forEach((node) => {
    graph.setNode(node.id, {
      width: Number(node.style?.width) || config.nodeWidth,
      height: Number(node.style?.height) || config.nodeHeight,
    })
  })

  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target)
  })

  dagre.layout(graph)

  const depthBuckets = new Map<number, Array<Node & { data: LayoutNodeData }>>()

  nodes.forEach((node) => {
    const depth = typeof (node.data as LayoutNodeData | undefined)?.depth === 'number'
      ? ((node.data as LayoutNodeData).depth as number)
      : 0
    const typedNode = node as Node & { data: LayoutNodeData }
    const bucket = depthBuckets.get(depth)

    if (bucket) {
      bucket.push(typedNode)
    } else {
      depthBuckets.set(depth, [typedNode])
    }
  })

  const layoutedNodes = nodes.map((node) => {
    const layoutNode = graph.node(node.id)

    return {
      ...node,
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      position: {
        x: layoutNode.x - config.nodeWidth / 2,
        y: layoutNode.y - config.nodeHeight / 2,
      },
    }
  })

  const compactedNodes = layoutedNodes.map((node) => ({ ...node }))

  ;[...depthBuckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .forEach(([depth, bucket]) => {
      const sortedIds = bucket
        .slice()
        .sort((left, right) => {
          const leftNode = graph.node(left.id)
          const rightNode = graph.node(right.id)
          return leftNode.x - rightNode.x || leftNode.y - rightNode.y
        })
        .map((item) => item.id)

      sortedIds.forEach((nodeId, index) => {
        const targetNode = compactedNodes.find((node) => node.id === nodeId)

        if (!targetNode) {
          return
        }

        const column = index % config.columnsPerDepth
        const row = Math.floor(index / config.columnsPerDepth)

        targetNode.position = {
          x: column * (config.nodeWidth + 48),
          y: depth * (config.ranksep + config.nodeHeight) + row * (config.nodeHeight + 36),
        }
      })
    })

  return {
    nodes: compactedNodes,
    edges,
  }
}
