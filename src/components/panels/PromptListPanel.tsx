import type { ReactNode } from 'react'
import { useEffect, useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import {
  collectGroupablePaths,
  getValueByPath,
  getGroupablePathsFromMetaSummary,
  groupPromptBlocks,
  searchPromptBlocks,
} from '../../lib/promptIndex'
import { useAppStore } from '../../store/useAppStore'
import type { PanelProps } from './types'

export function PromptListPanel({ node }: PanelProps) {
  const { t } = useTranslation()
  const blocks = useAppStore((state) => state.promptBlocks)
  const connectDirectory = useAppStore((state) => state.connectDirectory)
  const loadPromptBlocks = useAppStore((state) => state.loadPromptBlocks)
  const activeDirectory = useAppStore((state) => state.activeDirectory)
  const isDirectorySupported = useAppStore((state) => state.isDirectorySupported)
  const isLoadingBlocks = useAppStore((state) => state.isLoadingBlocks)
  const searchQuery = useAppStore((state) => state.searchQuery)
  const groupByPath = useAppStore((state) => state.groupByPath)
  const selectedPromptId = useAppStore((state) => state.selectedPromptId)
  const setFocusedFile = useAppStore((state) => state.setFocusedFile)
  const setSearchQuery = useAppStore((state) => state.setSearchQuery)
  const setGroupByPath = useAppStore((state) => state.setGroupByPath)
  const setSelectedPromptId = useAppStore((state) => state.setSelectedPromptId)
  const analyzeFilteredBlocks = useAppStore((state) => state.analyzeFilteredBlocks)
  const metaSummary = useAppStore((state) => state.metaSummary)

  const filteredBlocks = useMemo(() => searchPromptBlocks(blocks, searchQuery), [blocks, searchQuery])
  const groupedBlocks = useMemo(
    () => groupPromptBlocks(filteredBlocks, groupByPath),
    [filteredBlocks, groupByPath],
  )
  const groupablePaths = useMemo(
    () => getGroupablePathsFromMetaSummary(metaSummary).length > 0
      ? getGroupablePathsFromMetaSummary(metaSummary)
      : [],
    [metaSummary],
  )
  const fallbackGroupablePaths = useMemo(
    () => (groupablePaths.length > 0 ? groupablePaths : collectGroupablePaths(blocks)),
    [blocks, groupablePaths],
  )
  const visibleGroupablePaths = useMemo(
    () =>
      groupByPath.trim()
        ? fallbackGroupablePaths
            .filter((path) => path.toLowerCase().includes(groupByPath.trim().toLowerCase()))
            .slice(0, 200)
        : fallbackGroupablePaths.slice(0, 200),
    [fallbackGroupablePaths, groupByPath],
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
          <h2 className="text-xl font-semibold text-slate-50">
            <Trans t={t} i18nKey="promptList.title" />
          </h2>
          <p className="text-sm text-slate-300">
            <Trans t={t} i18nKey="promptList.description" />
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
            disabled={!isDirectorySupported || isLoadingBlocks}
            onClick={() => void connectDirectory()}
            type="button"
          >
            <Trans
              t={t}
              i18nKey={activeDirectory ? 'promptList.reconnectDirectory' : 'promptList.connectDirectory'}
            />
          </button>
          <button
            className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!activeDirectory || isLoadingBlocks}
            onClick={() => void loadPromptBlocks()}
            type="button"
          >
            <Trans t={t} i18nKey="promptList.refreshBlocks" />
          </button>
          <span className="text-xs text-slate-400">
            {isDirectorySupported ? (
              activeDirectory ? (
                <Trans t={t} i18nKey="promptList.directoryName" values={{ name: activeDirectory }} />
              ) : (
                <Trans t={t} i18nKey="promptList.directoryNotSelected" />
              )
            ) : (
              <Trans t={t} i18nKey="promptList.directoryApiUnavailable" />
            )}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <StatCard labelKey="promptList.loadedBlocks" value={String(blocks.length)} />
              <StatCard labelKey="promptList.filteredBlocks" value={String(filteredBlocks.length)}>
                <button
                  className="mt-3 w-full rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={filteredBlocks.length === 0}
                  onClick={() => analyzeFilteredBlocks(filteredBlocks)}
                  type="button"
                >
                  <Trans t={t} i18nKey="promptList.analyzeGroupStructure" />
                </button>
              </StatCard>
              <StatCard labelKey="promptList.groups" value={String(groupedBlocks.size)} />
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem]">
              <input
                className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('promptList.searchPlaceholder')}
                type="search"
                value={searchQuery}
              />
              <input
                className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
                list="groupable-paths"
                onChange={(event) => setGroupByPath(event.target.value)}
                placeholder={t('promptList.groupByPlaceholder')}
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
                        {groupByPath ? (
                          <Trans t={t} i18nKey="promptList.groupValueAt" values={{ path: groupByPath }} />
                        ) : (
                          <Trans t={t} i18nKey="promptList.ungroupedResultSet" />
                        )}
                      </div>
                    </div>
                    <div className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                      {groupBlocks.length}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {groupBlocks.slice(0, 8).map((block) => (
                      <div
                        className={`rounded-xl border px-3 py-2 transition ${
                          selectedPromptId === block.id
                            ? 'border-cyan-400 bg-cyan-400/10'
                            : 'border-slate-800 bg-slate-900/60 hover:border-slate-600'
                        }`}
                        key={block.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            className="min-w-0 flex-1 text-left"
                            onClick={() => setSelectedPromptId(block.id)}
                            type="button"
                          >
                            <div className="truncate text-sm font-medium text-slate-100">{block.displayName}</div>
                            <div className="truncate text-xs text-slate-400">{block.fileName}</div>
                            <div className="truncate text-xs text-slate-500">{block.relativePath}</div>
                            <div className="mt-1 truncate text-xs text-slate-400">
                              <Trans
                                t={t}
                                i18nKey="promptList.keys"
                                values={{ keys: block.topLevelKeys.join(', ') || t('promptList.noKeys') }}
                              />
                            </div>
                            {block.mmssType ? (
                              <div className="mt-2 inline-flex max-w-full rounded-full border border-violet-400/25 bg-violet-400/10 px-2 py-1 text-[11px] text-violet-100/85">
                                <span className="truncate">{block.mmssType}</span>
                              </div>
                            ) : null}
                          </button>
                          <button
                            className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-400/15"
                            onClick={() => setFocusedFile(block.id)}
                            type="button"
                          >
                            <Trans t={t} i18nKey="promptList.openFileGraph" />
                          </button>
                        </div>
                        {groupByPath ? (
                          <div className="mt-1 truncate text-xs text-cyan-300/80">
                            <Trans
                              t={t}
                              i18nKey="promptList.pathValue"
                              values={{
                                path: groupByPath,
                                value: formatValue(getValueByPath(block.data, groupByPath)),
                              }}
                            />
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                <Trans t={t} i18nKey="promptList.groupablePaths" />
              </div>
              <div className="mt-1 text-sm text-slate-300">
                <Trans t={t} i18nKey="promptList.groupablePathsDescription" />
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

function StatCard({
  labelKey,
  value,
  children,
}: {
  labelKey: string
  value: string
  children?: ReactNode
}) {
  const { t } = useTranslation()

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">
        <Trans t={t} i18nKey={labelKey} />
      </div>
      <div className="text-3xl font-semibold text-emerald-300">{value}</div>
      {children}
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
