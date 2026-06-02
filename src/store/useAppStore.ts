import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { isDirectoryPickerSupported, pickDirectory } from '../lib/fileSystemAccess'
import { buildPromptBlock, type PromptBlock } from '../lib/promptIndex'

type AppState = {
  activeDirectory: string | null
  directoryHandle: FileSystemDirectoryHandle | null
  isDirectorySupported: boolean
  isLoadingBlocks: boolean
  promptBlocks: PromptBlock[]
  selectedPromptId: string | null
  searchQuery: string
  groupByPath: string
  statusMessage: string
  connectDirectory: () => Promise<void>
  loadPromptBlocks: () => Promise<void>
  setSelectedPromptId: (promptId: string | null) => void
  setSearchQuery: (query: string) => void
  setGroupByPath: (path: string) => void
  setStatusMessage: (message: string) => void
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
      searchQuery: '',
      groupByPath: '',
      statusMessage: 'Select a directory to load prompt data into memory.',
      connectDirectory: async () => {
        try {
          const { handle, name } = await pickDirectory()

          set({
            activeDirectory: name,
            directoryHandle: handle,
            isLoadingBlocks: true,
            statusMessage: `Connected to directory: ${name}. Reading JSON files...`,
          })

          await loadBlocksIntoStore(handle, set, get)
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to connect directory handle.'

          set({
            isLoadingBlocks: false,
            statusMessage: message,
          })
        }
      },
      loadPromptBlocks: async () => {
        const handle = get().directoryHandle

        if (!handle) {
          set({
            statusMessage: 'No directory handle available. Connect a directory first.',
          })
          return
        }

        set({
          isLoadingBlocks: true,
          statusMessage: `Refreshing JSON blocks from ${handle.name}...`,
        })

        await loadBlocksIntoStore(handle, set, get)
      },
      setSelectedPromptId: (promptId) => {
        set({
          selectedPromptId: promptId,
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
    }),
    {
      name: 'abstract-mind-lab-ui',
      partialize: (state) => ({
        activeDirectory: state.activeDirectory,
        promptBlocks: state.promptBlocks,
        selectedPromptId: state.selectedPromptId,
        searchQuery: state.searchQuery,
        groupByPath: state.groupByPath,
        statusMessage: state.statusMessage,
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
      statusMessage: `Loaded ${promptBlocks.length} JSON blocks from ${handle.name}.`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read JSON blocks.'

    set({
      isLoadingBlocks: false,
      statusMessage: message,
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
