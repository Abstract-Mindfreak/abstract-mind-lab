import { useEffect, useMemo } from 'react'
import {
  collectGroupablePaths,
  getValueByPath,
  groupPromptBlocks,
  searchPromptBlocks,
} from '../../lib/promptIndex'
import { useAppStore } from '../../store/useAppStore'
import type { PanelProps } from './types'

export function PromptListPanel({ node }: PanelProps) {
  const blocks = useAppStore((state) => state.promptBlocks)
  const connectDirectory = useAppStore((state) => state.connectDirectory)
  const loadPromptBlocks = useAppStore((state) => state.loadPromptBlocks)
  const activeDirectory = useAppStore((state) => state.activeDirectory)
  const isDirectorySupported = useAppStore((state) => state.isDirectorySupported)
  const isLoadingBlocks = useAppStore((state) => state.isLoadingBlocks)
  const searchQuery = useAppStore((state) => state.searchQuery)
  const groupByPath = useAppStore((state) => state.groupByPath)
  const selectedPromptId = useAppStore((state) => state.selectedPromptId)
  const setSearchQuery = useAppStore((state) => state.setSearchQuery)
  const setGroupByPath = useAppStore((state) => state.setGroupByPath)
  const setSelectedPromptId = useAppStore((state) => state.setSelectedPromptId)

  const filteredBlocks = useMemo(() => searchPromptBlocks(blocks, searchQuery), [blocks, searchQuery])
  const groupedBlocks = useMemo(
    () => groupPromptBlocks(filteredBlocks, groupByPath),
    [filteredBlocks, groupByPath],
  )
  const groupablePaths = useMemo(() => collectGroupablePaths(blocks), [blocks])
  const visibleGroupablePaths = useMemo(
    () =>
      groupByPath.trim()
        ? groupablePaths
            .filter((path) => path.toLowerCase().includes(groupByPath.trim().toLowerCase()))
            .slice(0, 200)
        : groupablePaths.slice(0, 200),
    [groupByPath, groupablePaths],
  )

  useEffect(() => {
    if (filteredBlocks.length === 0) {
      if (selectedPromptId !== null) {
        setSelectedPromptId(null)
      }
      return
    }

    if (!selectedPromptId || !filteredBlocks.some((block) => block.id === selectedPromptId)) {
      setSelectedPromptId(filteredBlocks[0].id)
    }
  }, [filteredBlocks, selectedPromptId, setSelectedPromptId])

  return (
    <section className="panel-shell">
      <div className="panel-card space-y-4">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">{node.getName()}</p>
          <h2 className="text-xl font-semibold text-slate-50">Prompt workspace</h2>
          <p className="text-sm text-slate-300">
            Panel reads local JSON files into memory, supports fast search by content, and can
            group the dataset by dynamic key paths.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
            disabled={!isDirectorySupported || isLoadingBlocks}
            onClick={() => void connectDirectory()}
            type="button"
          >
            {activeDirectory ? 'Reconnect Directory' : 'Connect Directory'}
          </button>
          <button
            className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!activeDirectory || isLoadingBlocks}
            onClick={() => void loadPromptBlocks()}
            type="button"
          >
            Refresh Blocks
          </button>
          <span className="text-xs text-slate-400">
            {isDirectorySupported
              ? activeDirectory ?? 'Directory handle not selected'
              : 'File System Access API is not available in this browser'}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <StatCard label="Loaded blocks" value={String(blocks.length)} />
              <StatCard label="Filtered blocks" value={String(filteredBlocks.length)} />
              <StatCard label="Groups" value={String(groupedBlocks.size)} />
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem]">
              <input
                className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search file names, keys, or JSON text"
                type="search"
                value={searchQuery}
              />
              <input
                className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
                list="groupable-paths"
                onChange={(event) => setGroupByPath(event.target.value)}
                placeholder="Group by key path"
                type="text"
                value={groupByPath}
              />
              <datalist id="groupable-paths">
                {visibleGroupablePaths.map((path) => (
                  <option key={path} value={path} />
                ))}
              </datalist>
            </div>

            <div className="space-y-3">
              {[...groupedBlocks.entries()].slice(0, 24).map(([group, groupBlocks]) => (
                <div
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3"
                  key={`${group}-${groupBlocks.length}`}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-100">{group}</div>
                      <div className="text-xs text-slate-500">
                        {groupByPath ? `Value at ${groupByPath}` : 'Ungrouped result set'}
                      </div>
                    </div>
                    <div className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                      {groupBlocks.length}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {groupBlocks.slice(0, 8).map((block) => (
                      <button
                        className={`block w-full rounded-xl border px-3 py-2 text-left transition ${
                          selectedPromptId === block.id
                            ? 'border-cyan-400 bg-cyan-400/10'
                            : 'border-slate-800 bg-slate-900/60 hover:border-slate-600'
                        }`}
                        key={block.id}
                        onClick={() => setSelectedPromptId(block.id)}
                        type="button"
                      >
                        <div className="truncate text-sm font-medium text-slate-100">{block.fileName}</div>
                        <div className="truncate text-xs text-slate-500">{block.relativePath}</div>
                        <div className="mt-1 truncate text-xs text-slate-400">
                          keys: {block.topLevelKeys.join(', ') || 'none'}
                        </div>
                        {groupByPath ? (
                          <div className="mt-1 truncate text-xs text-cyan-300/80">
                            {groupByPath}: {formatValue(getValueByPath(block.data, groupByPath))}
                          </div>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Groupable paths</div>
              <div className="mt-1 text-sm text-slate-300">
                Auto-collected from loaded JSON objects.
              </div>
            </div>
            <div className="max-h-[40rem] space-y-2 overflow-auto">
              {visibleGroupablePaths.slice(0, 80).map((path) => (
                <button
                  className={`block w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                    path === groupByPath
                      ? 'border-cyan-400 bg-cyan-400/10 text-cyan-200'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-600'
                  }`}
                  key={path}
                  onClick={() => setGroupByPath(path === groupByPath ? '' : path)}
                  type="button"
                >
                  <span className="block truncate">{path}</span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="text-3xl font-semibold text-emerald-300">{value}</div>
    </div>
  )
}

function formatValue(value: unknown) {
  if (value === undefined) {
    return 'undefined'
  }

  if (value === null) {
    return 'null'
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}
