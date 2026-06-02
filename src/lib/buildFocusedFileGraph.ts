import type { Edge, Node } from '@xyflow/react'
import type { PromptBlock } from './promptIndex'

type BuildFocusedFileGraphArgs = {
  block: PromptBlock
}

type GraphBuildResult = {
  nodes: Node[]
  edges: Edge[]
}

const MAX_NODES = 80

export function buildFocusedFileGraph({ block }: BuildFocusedFileGraphArgs): GraphBuildResult {
  const nodes: Node[] = []
  const edges: Edge[] = []
  let createdNodes = 0

  const visit = (
    value: unknown,
    label: string,
    path: string,
    depth: number,
    siblingIndex: number,
    parentNodeId?: string,
  ) => {
    if (createdNodes >= MAX_NODES) {
      return
    }

    const nodeId = `fragment:${block.id}:${path || '$'}`
    createdNodes += 1

    const isRoot = path === '$'
    const isArray = Array.isArray(value)
    const isObject = !isArray && !!value && typeof value === 'object'
    const kind = isRoot ? 'root' : isArray ? 'array' : isObject ? 'object' : 'value'

    nodes.push({
      id: nodeId,
      type: 'jsonFragment',
      position: {
        x: depth * 340,
        y: siblingIndex * 160,
      },
      draggable: false,
      data: {
        kind,
        label,
        path,
        valuePreview: !isArray && !isObject ? previewValue(value) : undefined,
        childrenCount: isObject ? Object.keys(value as Record<string, unknown>).length : undefined,
        itemsCount: isArray ? (value as unknown[]).length : undefined,
      },
    })

    if (parentNodeId) {
      edges.push({
        id: `${parentNodeId}->${nodeId}`,
        source: parentNodeId,
        target: nodeId,
        type: 'smoothstep',
      })
    }

    if (isArray) {
      ;(value as unknown[]).slice(0, 8).forEach((item, index) => {
        visit(item, `[${index}]`, `${path}[${index}]`, depth + 1, siblingIndex * 10 + index, nodeId)
      })
      return
    }

    if (isObject) {
      Object.entries(value as Record<string, unknown>)
        .slice(0, 12)
        .forEach(([key, childValue], index) => {
          visit(childValue, key, path === '$' ? key : `${path}.${key}`, depth + 1, siblingIndex * 12 + index, nodeId)
        })
    }
  }

  visit(block.data, block.fileName, '$', 0, 0)

  return { nodes, edges }
}

function previewValue(value: unknown) {
  if (value === null) {
    return 'null'
  }

  if (value === undefined) {
    return 'undefined'
  }

  if (typeof value === 'string') {
    return value.length > 64 ? `${value.slice(0, 61)}...` : value
  }

  return String(value)
}
