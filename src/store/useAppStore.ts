import { create } from 'zustand'
import { createCompoundSchema, type Schema } from 'genson-js'
import { persist } from 'zustand/middleware'
import { buildPromptDiff, type DiffSelection } from '../lib/diffing'
import { isDirectoryPickerSupported, pickDirectory } from '../lib/fileSystemAccess'
import { buildPromptBlock, type PromptBlock } from '../lib/promptIndex'

type UiMessage = {
  key: string
  values?: Record<string, string | number>
}

type GraphSelectionPayload = {
  edgePairs: Array<{ sourcePromptId?: string; targetPromptId?: string }>
  nodeIds: string[]
}

type AppState = {
  activeDirectory: string | null
  directoryHandle: FileSystemDirectoryHandle | null
  isDirectorySupported: boolean
  isLoadingBlocks: boolean
  promptBlocks: PromptBlock[]
  selectedPromptId: string | null
  focusedFileId: string | null
  searchQuery: string
  groupByPath: string
  statusMessage: UiMessage
  diffSelection: DiffSelection | null
  generatedSchema: Schema | null
  schemaSourceCount: number
  connectDirectory: () => Promise<void>
  loadPromptBlocks: () => Promise<void>
  setSelectedPromptId: (promptId: string | null) => void
  setFocusedFile: (fileId: string | null) => void
  setSearchQuery: (query: string) => void
  setGroupByPath: (path: string) => void
  setStatusMessage: (message: UiMessage) => void
  analyzeFilteredBlocks: (blocks: PromptBlock[]) => void
  updateDiffFromGraphSelection: (selection: GraphSelectionPayload) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeDirectory: null,
      directoryHandle: null,
      isDirectorySupported: isDirectoryPickerSupported(),
      isLoadingBlocks: false,
      promptBlocks: [],
      selectedPromptId: null,
      focusedFileId: null,
      searchQuery: '',
      groupByPath: '',
      statusMessage: { key: 'store.selectDirectory' },
      diffSelection: null,
      generatedSchema: null,
      schemaSourceCount: 0,
      connectDirectory: async () => {
        try {
          const { handle, name } = await pickDirectory()

          set({
            activeDirectory: name,
            directoryHandle: handle,
            isLoadingBlocks: true,
            statusMessage: {
              key: 'store.connectedReading',
              values: { name },
            },
          })

          await loadBlocksIntoStore(handle, set, get)
        } catch (error) {
          set({
            isLoadingBlocks: false,
            statusMessage: {
              key: error instanceof Error ? error.message : 'store.connectFailed',
            },
          })
        }
      },
      loadPromptBlocks: async () => {
        const handle = get().directoryHandle

        if (!handle) {
          set({
            statusMessage: { key: 'store.directoryHandleMissing' },
          })
          return
        }

        set({
          isLoadingBlocks: true,
          statusMessage: {
            key: 'store.refreshingBlocks',
            values: { name: handle.name },
          },
        })

        await loadBlocksIntoStore(handle, set, get)
      },
      setSelectedPromptId: (promptId) => {
        set({
          selectedPromptId: promptId,
          generatedSchema: null,
          schemaSourceCount: 0,
        })
      },
      setFocusedFile: (fileId) => {
        set({
          focusedFileId: fileId,
          selectedPromptId: fileId,
        })
      },
      setSearchQuery: (query) => {
        set({
          searchQuery: query,
        })
      },
      setGroupByPath: (path) => {
        set({
          groupByPath: path,
        })
      },
      setStatusMessage: (message) => {
        set({
          statusMessage: message,
        })
      },
      analyzeFilteredBlocks: (blocks) => {
        if (blocks.length === 0) {
          set({
            generatedSchema: null,
            schemaSourceCount: 0,
            statusMessage: { key: 'store.schemaUnavailable' },
          })
          return
        }

        const schema = createCompoundSchema(blocks.map((block) => block.data))

        set({
          generatedSchema: schema,
          schemaSourceCount: blocks.length,
          statusMessage: {
            key: 'store.schemaBuilt',
            values: { count: blocks.length },
          },
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
    }),
    {
      name: 'abstract-mind-lab-ui',
      version: 3,
      migrate: (persistedState) => {
        const state = persistedState as Partial<AppState> | undefined

        return {
          selectedPromptId: state?.selectedPromptId ?? null,
          focusedFileId: state?.focusedFileId ?? null,
          searchQuery: state?.searchQuery ?? '',
          groupByPath: state?.groupByPath ?? '',
        }
      },
      partialize: (state) => ({
        selectedPromptId: state.selectedPromptId,
        focusedFileId: state.focusedFileId,
        searchQuery: state.searchQuery,
        groupByPath: state.groupByPath,
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
    const fileEntries = await readJsonFiles(handle)
    const promptBlocks = fileEntries.map(buildPromptBlock).filter((block): block is PromptBlock => block !== null)
    const selectedPromptId = ensureSelectedPromptId(promptBlocks, get().selectedPromptId)

    set({
      isLoadingBlocks: false,
      promptBlocks,
      selectedPromptId,
      generatedSchema: null,
      schemaSourceCount: 0,
      statusMessage: {
        key: 'store.connectedLoaded',
        values: { count: promptBlocks.length, name: handle.name },
      },
    })
  } catch (error) {
    set({
      isLoadingBlocks: false,
      statusMessage: {
        key: error instanceof Error ? error.message : 'store.readFailed',
      },
    })
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
