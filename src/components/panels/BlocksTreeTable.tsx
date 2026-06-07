import { useState, useEffect } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import type { PanelProps } from './types'
import { useAppStore } from '../../store/useAppStore'

interface TreeNode {
  id: string
  slug: string
  block_type?: string
  layer?: number
  is_group: boolean
  subRows?: TreeNode[]
}

export function BlocksTreeTable({ node }: PanelProps) {
  const { t } = useTranslation()
  const treeRefreshCounter = useAppStore((state) => state.treeRefreshCounter)
  const setSelectedBlockContent = useAppStore((state) => state.setSelectedBlockContent)
  const [treeData, setTreeData] = useState<TreeNode[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTreeData()
  }, [treeRefreshCounter])

  const loadTreeData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('http://localhost:8005/api/music-blocks/tree')
      if (!response.ok) {
        throw new Error('Failed to load tree data')
      }
      const data = await response.json()
      setTreeData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tree data')
    } finally {
      setLoading(false)
    }
  }

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const handleNodeClick = async (node: TreeNode) => {
    if (node.is_group) return

    try {
      const response = await fetch(`http://localhost:8005/api/music-blocks/?slug=${node.slug}`)
      if (!response.ok) {
        throw new Error('Failed to load block details')
      }
      const data = await response.json()
      if (data && data.length > 0) {
        setSelectedBlockContent(data[0])
      }
    } catch (err) {
      console.error('Failed to load block details:', err)
    }
  }

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id)
    const hasChildren = node.subRows && node.subRows.length > 0

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 transition hover:border-slate-600 ${!node.is_group ? 'cursor-pointer hover:border-cyan-400' : ''}`}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
          onClick={() => !node.is_group && handleNodeClick(node)}
        >
          {hasChildren && (
            <button
              className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300"
              onClick={(e) => {
                e.stopPropagation()
                toggleNode(node.id)
              }}
              type="button"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <div className="h-6 w-6" />}
          
          <div className="flex-1">
            <div className="truncate text-sm font-medium text-slate-100">{node.slug}</div>
            {node.block_type && (
              <div className="text-xs text-slate-500">
                {node.block_type} {node.layer !== undefined && `• Layer ${node.layer}`}
              </div>
            )}
          </div>
          
          {node.is_group && (
            <div className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
              {node.subRows?.length || 0}
            </div>
          )}
        </div>
        
        {isExpanded && hasChildren && (
          <div className="mt-1 space-y-1">
            {node.subRows?.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <section className="panel-shell">
      <div className="panel-card space-y-4">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">{node.getName()}</p>
          <h2 className="text-xl font-semibold text-slate-50">
            <Trans t={t} i18nKey="blocksTree.title" />
          </h2>
          <p className="text-sm text-slate-300">
            <Trans t={t} i18nKey="blocksTree.description" />
          </p>
        </header>

        <div className="flex items-center gap-3">
          <button
            className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
            onClick={loadTreeData}
            type="button"
          >
            <Trans t={t} i18nKey="blocksTree.refresh" />
          </button>
          {error && (
            <span className="text-sm text-red-400">{error}</span>
          )}
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-center text-slate-400">
              <Trans t={t} i18nKey="blocksTree.loading" />
            </div>
          ) : treeData.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-center text-slate-400">
              <Trans t={t} i18nKey="blocksTree.empty" />
            </div>
          ) : (
            <div className="space-y-1">
              {treeData.map(node => renderNode(node))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
