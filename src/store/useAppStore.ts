import type { IJsonModel } from 'flexlayout-react'
import { createCompoundSchema, type Schema } from 'genson-js'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  buildMultiPromptSelection,
  buildPromptDiff,
  type DiffSelection,
} from '../lib/diffing'
import { isDirectoryPickerSupported, pickDirectory } from '../lib/fileSystemAccess'
import { buildPromptBlock, type MetaSummary, type PromptBlock } from '../lib/promptIndex'

type UiMessage = {
  key: string
  values?: Record<string, string | number>
}

type WorkspaceActionHandlers = {
  openBlankEditorTab: (draftId: string) => void
  openPromptInNewTab: (promptId: string) => void
  openPromptInPreview: (promptId: string) => void
}

type GraphNodeLayout = {
  height?: number
  width?: number
  x: number
  y: number
}

type SystemLogEntry = {
  id: string
  message: UiMessage
  timestamp: string
}

type DraftDocument = {
  content: string
  id: string
  name: string
}

type FontScale = 'x-small' | 'medium' | 'large'
type UiTheme = 'dark' | 'light' | 'rounded'

type GraphSelectionPayload = {
  edgePairs: Array<{ sourcePromptId?: string; targetPromptId?: string }>
  nodeIds: string[]
}

type AppState = {
  activeDirectory: string | null
  appendSystemLog: (message: UiMessage) => void
  analyzeFilteredBlocks: (blocks: PromptBlock[]) => void
  connectDirectory: () => Promise<void>
  diffSelection: DiffSelection | null
  directoryHandle: FileSystemDirectoryHandle | null
  draftDocuments: Record<string, DraftDocument>
  fontScale: FontScale
  generatedSchema: Schema | null
  graphNodeLayouts: Record<string, GraphNodeLayout>
  groupByPath: string
  isDirectorySupported: boolean
  isLoadingBlocks: boolean
  layoutSnapshot: IJsonModel | null
  loadPromptBlocks: () => Promise<void>
  metaSummary: MetaSummary | null
  openBlankEditorTab: () => void
  openPromptInNewTab: (promptId: string) => void
  openPromptInPreview: (promptId: string | null) => void
  promptBlocks: PromptBlock[]
  registerWorkspaceActions: (actions: WorkspaceActionHandlers | null) => void
  registeredWorkspaceActions: WorkspaceActionHandlers | null
  removeDraftDocument: (draftId: string) => void
  renameDraftDocument: (draftId: string, name: string) => void
  schemaSourceCount: number
  searchQuery: string
  selectedPromptId: string | null
  setFontScale: (scale: FontScale) => void
  setGroupByPath: (path: string) => void
  setLayoutSnapshot: (snapshot: IJsonModel) => void
  setSearchQuery: (query: string) => void
  setSelectedPromptId: (promptId: string | null) => void
  setShowEdgeLabels: (enabled: boolean) => void
  setShowMiniMap: (enabled: boolean) => void
  setStatusMessage: (message: UiMessage) => void
  setUiTheme: (theme: UiTheme) => void
  showEdgeLabels: boolean
  showMiniMap: boolean
  statusMessage: UiMessage
  systemLogs: SystemLogEntry[]
  uiTheme: UiTheme
  updateDiffFromGraphSelection: (selection: GraphSelectionPayload) => void
  upsertDraftDocument: (draft: DraftDocument) => void
  upsertGraphNodeLayouts: (layouts: Record<string, Partial<GraphNodeLayout>>) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeDirectory: null,
      directoryHandle: null,
      draftDocuments: {},
      fontScale: 'medium',
      generatedSchema: null,
      graphNodeLayouts: {},
      groupByPath: '',
      isDirectorySupported: isDirectoryPickerSupported(),
      isLoadingBlocks: false,
      layoutSnapshot: null,
      metaSummary: null,
      promptBlocks: [],
      registeredWorkspaceActions: null,
      schemaSourceCount: 0,
      searchQuery: '',
      selectedPromptId: null,
      showEdgeLabels: true,
      showMiniMap: true,
      statusMessage: { key: 'store.selectDirectory' },
      systemLogs: [],
      uiTheme: 'dark',
      diffSelection: null,
      appendSystemLog: (message) => {
        set((state) => ({
          systemLogs: [
            {
              id: `${Date.now()}-${state.systemLogs.length}`,
              message,
              timestamp: new Date().toISOString(),
            },
            ...state.systemLogs,
          ].slice(0, 120),
        }))
      },
      analyzeFilteredBlocks: (blocks) => {
        if (blocks.length === 0) {
          const message = { key: 'store.schemaUnavailable' }
          set({
            generatedSchema: null,
            schemaSourceCount: 0,
            statusMessage: message,
          })
          get().appendSystemLog(message)
          return
        }

        const schema = createCompoundSchema(blocks.map((block) => block.data))
        const message = {
          key: 'store.schemaBuilt',
          values: { count: blocks.length },
        }

        set({
          generatedSchema: schema,
          schemaSourceCount: blocks.length,
          statusMessage: message,
        })
        get().appendSystemLog(message)
      },
      connectDirectory: async () => {
        try {
          const { handle, name } = await pickDirectory()
          const message = {
            key: 'store.connectedReading',
            values: { name },
          }

          set({
            activeDirectory: name,
            directoryHandle: handle,
            isLoadingBlocks: true,
            statusMessage: message,
          })
          get().appendSystemLog(message)

          await loadBlocksIntoStore(handle, set, get)
        } catch (error) {
          const message = {
            key: error instanceof Error ? error.message : 'store.connectFailed',
          }
          set({
            isLoadingBlocks: false,
            statusMessage: message,
          })
          get().appendSystemLog(message)
        }
      },
      loadPromptBlocks: async () => {
        const handle = get().directoryHandle

        if (!handle) {
          const message = { key: 'store.directoryHandleMissing' }
          set({
            statusMessage: message,
          })
          get().appendSystemLog(message)
          return
        }

        const message = {
          key: 'store.refreshingBlocks',
          values: { name: handle.name },
        }

        set({
          isLoadingBlocks: true,
          statusMessage: message,
        })
        get().appendSystemLog(message)

        await loadBlocksIntoStore(handle, set, get)
      },
      openBlankEditorTab: () => {
        const draftId = `draft:${Date.now()}`
        const name = `Новый JSON ${Object.keys(get().draftDocuments).length + 1}`

        set((state) => ({
          draftDocuments: {
            ...state.draftDocuments,
            [draftId]: {
              id: draftId,
              name,
              content: '{\n  \n}',
            },
          },
        }))

        get().registeredWorkspaceActions?.openBlankEditorTab(draftId)
      },
      openPromptInNewTab: (promptId) => {
        const block = get().promptBlocks.find((item) => item.id === promptId)

        if (!block) {
          return
        }

        set({
          generatedSchema: null,
          schemaSourceCount: 0,
          selectedPromptId: promptId,
        })
        get().registeredWorkspaceActions?.openPromptInNewTab(promptId)
      },
      openPromptInPreview: (promptId) => {
        set({
          generatedSchema: null,
          schemaSourceCount: 0,
          selectedPromptId: promptId,
        })

        if (promptId) {
          get().registeredWorkspaceActions?.openPromptInPreview(promptId)
        }
      },
      registerWorkspaceActions: (actions) => {
        set({
          registeredWorkspaceActions: actions,
        })
      },
      removeDraftDocument: (draftId) => {
        set((state) => {
          const nextDrafts = { ...state.draftDocuments }
          delete nextDrafts[draftId]

          return {
            draftDocuments: nextDrafts,
          }
        })
      },
      renameDraftDocument: (draftId, name) => {
        set((state) => {
          const draft = state.draftDocuments[draftId]

          if (!draft) {
            return state
          }

          return {
            draftDocuments: {
              ...state.draftDocuments,
              [draftId]: {
                ...draft,
                name,
              },
            },
          }
        })
      },
      setFontScale: (scale) => {
        set({
          fontScale: scale,
        })
      },
      setGroupByPath: (path) => {
        set({
          groupByPath: path,
        })
      },
      setLayoutSnapshot: (snapshot) => {
        set({
          layoutSnapshot: snapshot,
        })
      },
      setSearchQuery: (query) => {
        set({
          searchQuery: query,
        })
      },
      setSelectedPromptId: (promptId) => {
        set({
          generatedSchema: null,
          schemaSourceCount: 0,
          selectedPromptId: promptId,
        })
      },
      setShowEdgeLabels: (enabled) => {
        set({
          showEdgeLabels: enabled,
        })
      },
      setShowMiniMap: (enabled) => {
        set({
          showMiniMap: enabled,
        })
      },
      setStatusMessage: (message) => {
        set({
          statusMessage: message,
        })
        get().appendSystemLog(message)
      },
      setUiTheme: (theme) => {
        set({
          uiTheme: theme,
        })
      },
      updateDiffFromGraphSelection: (selection) => {
        const promptBlocks = get().promptBlocks
        const blockMap = new Map(promptBlocks.map((block) => [block.id, block]))
        const edgePair = selection.edgePairs.find(
          (pair) => pair.sourcePromptId && pair.targetPromptId,
        )

        if (edgePair?.sourcePromptId && edgePair.targetPromptId) {
          const sourceBlock = blockMap.get(edgePair.sourcePromptId)
          const targetBlock = blockMap.get(edgePair.targetPromptId)

          if (sourceBlock && targetBlock) {
            applyDiffSelection(set, sourceBlock, targetBlock)
            return
          }
        }

        const selectedBlocks = selection.nodeIds
          .map((id) => blockMap.get(id))
          .filter((block): block is PromptBlock => block !== undefined)

        if (selectedBlocks.length > 2) {
          const message = {
            key: 'store.diffMultiSelection',
            values: { count: selectedBlocks.length },
          }

          set({
            diffSelection: buildMultiPromptSelection(selectedBlocks),
            statusMessage: message,
          })
          return
        }

        if (selectedBlocks.length === 2) {
          applyDiffSelection(set, selectedBlocks[0], selectedBlocks[1])
          return
        }

        if (selection.nodeIds.length === 0 && selection.edgePairs.length === 0) {
          set({
            diffSelection: null,
            statusMessage: { key: 'store.diffSelectHint' },
          })
          return
        }

        set({
          diffSelection: null,
          statusMessage: {
            key:
              selectedBlocks.length > 0 || selection.edgePairs.length > 0
                ? 'store.diffInsufficientSelection'
                : 'store.diffSelectionUnsupported',
          },
        })
      },
      upsertDraftDocument: (draft) => {
        set((state) => ({
          draftDocuments: {
            ...state.draftDocuments,
            [draft.id]: draft,
          },
        }))
      },
      upsertGraphNodeLayouts: (layouts) => {
        set((state) => {
          const nextLayouts = { ...state.graphNodeLayouts }

          for (const [nodeId, partial] of Object.entries(layouts)) {
            const previous = nextLayouts[nodeId] ?? { x: 0, y: 0 }

            nextLayouts[nodeId] = {
              x: partial.x ?? previous.x,
              y: partial.y ?? previous.y,
              width: partial.width ?? previous.width,
              height: partial.height ?? previous.height,
            }
          }

          return {
            graphNodeLayouts: nextLayouts,
          }
        })
      },
    }),
    {
      name: 'abstract-mind-lab-ui',
      version: 4,
      migrate: (persistedState) => {
        const state = persistedState as Partial<AppState> | undefined

        return {
          draftDocuments: state?.draftDocuments ?? {},
          fontScale: state?.fontScale ?? 'medium',
          graphNodeLayouts: state?.graphNodeLayouts ?? {},
          groupByPath: state?.groupByPath ?? '',
          layoutSnapshot: null,
          searchQuery: state?.searchQuery ?? '',
          selectedPromptId: state?.selectedPromptId ?? null,
          showEdgeLabels: state?.showEdgeLabels ?? true,
          showMiniMap: state?.showMiniMap ?? true,
          uiTheme: state?.uiTheme ?? 'dark',
        }
      },
      partialize: (state) => ({
        draftDocuments: state.draftDocuments,
        fontScale: state.fontScale,
        graphNodeLayouts: state.graphNodeLayouts,
        groupByPath: state.groupByPath,
        layoutSnapshot: state.layoutSnapshot,
        searchQuery: state.searchQuery,
        selectedPromptId: state.selectedPromptId,
        showEdgeLabels: state.showEdgeLabels,
        showMiniMap: state.showMiniMap,
        uiTheme: state.uiTheme,
      }),
    },
  ),
)

async function loadBlocksIntoStore(
  handle: FileSystemDirectoryHandle,
  set: (partial: Partial<AppState>) => void,
  get: () => AppState,
) {
  try {
    const metaSummary = await readMetaSummary(handle)
    const fileEntries = await readJsonFiles(handle)
    const promptBlocks = fileEntries
      .map((entry) => buildPromptBlock(entry, metaSummary?.files_manifest[entry.relativePath]))
      .filter((block): block is PromptBlock => block !== null)
    const selectedPromptId = ensureSelectedPromptId(promptBlocks, get().selectedPromptId)

    set({
      isLoadingBlocks: false,
      metaSummary,
      promptBlocks,
      selectedPromptId,
      generatedSchema: null,
      schemaSourceCount: 0,
      statusMessage: {
        key: 'store.connectedLoaded',
        values: { count: promptBlocks.length, name: handle.name },
      },
    })
    get().appendSystemLog({
      key: 'store.connectedLoaded',
      values: { count: promptBlocks.length, name: handle.name },
    })
  } catch (error) {
    const message = {
      key: error instanceof Error ? error.message : 'store.readFailed',
    }
    set({
      isLoadingBlocks: false,
      statusMessage: message,
    })
    get().appendSystemLog(message)
  }
}

async function readJsonFiles(
  handle: FileSystemDirectoryHandle,
  relativeRoot = '',
): Promise<Array<{ fileName: string; relativePath: string; rawText: string }>> {
  const entries: Array<{ fileName: string; relativePath: string; rawText: string }> = []

  for await (const [name, childHandle] of handle.entries()) {
    const relativePath = relativeRoot ? `${relativeRoot}/${name}` : name

    if (childHandle.kind === 'directory') {
      entries.push(...(await readJsonFiles(childHandle, relativePath)))
      continue
    }

    if (relativePath === 'meta_summary.json') {
      continue
    }

    if (!name.toLowerCase().endsWith('.json')) {
      continue
    }

    const file = await childHandle.getFile()
    entries.push({
      fileName: name,
      relativePath,
      rawText: await file.text(),
    })
  }

  return entries
}

async function readMetaSummary(handle: FileSystemDirectoryHandle): Promise<MetaSummary | null> {
  try {
    const summaryHandle = await handle.getFileHandle('meta_summary.json')
    const summaryFile = await summaryHandle.getFile()
    const parsed = JSON.parse(await summaryFile.text()) as MetaSummary

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !parsed.global_stats ||
      !parsed.files_manifest
    ) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function ensureSelectedPromptId(blocks: PromptBlock[], selectedPromptId: string | null) {
  if (selectedPromptId && blocks.some((block) => block.id === selectedPromptId)) {
    return selectedPromptId
  }

  return blocks[0]?.id ?? null
}

function applyDiffSelection(
  set: (partial: Partial<AppState>) => void,
  sourceBlock: PromptBlock,
  targetBlock: PromptBlock,
) {
  const diffSelection = buildPromptDiff(sourceBlock, targetBlock)

  set({
    diffSelection,
    statusMessage: {
      key: diffSelection.delta ? 'store.diffBuilt' : 'store.diffIdentical',
      values: { source: sourceBlock.fileName, target: targetBlock.fileName },
    },
  })
}
