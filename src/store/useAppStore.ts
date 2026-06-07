import { create } from 'zustand'
import { createCompoundSchema, type Schema } from 'genson-js'
import { persist } from 'zustand/middleware'
import { buildPromptDiff, type DiffSelection } from '../lib/diffing'
import { buildPromptBlock, type PromptBlock } from '../lib/promptIndex'

const API_BASE_URL = 'http://localhost:8005/api'

type UiMessage = {
  key: string
  values?: Record<string, string | number>
}

type GraphSelectionPayload = {
  edgePairs: Array<{ sourcePromptId?: string; targetPromptId?: string }>
  nodeIds: string[]
}

type AppState = {
  isConnected: boolean
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
  connectDatabase: () => Promise<void>
  loadSongs: () => Promise<void>
  loadSessions: () => Promise<void>
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
      isConnected: false,
      isLoadingBlocks: false,
      promptBlocks: [],
      selectedPromptId: null,
      focusedFileId: null,
      searchQuery: '',
      groupByPath: '',
      statusMessage: { key: 'store.connectDatabase' },
      diffSelection: null,
      generatedSchema: null,
      schemaSourceCount: 0,
      connectDatabase: async () => {
        try {
          set({
            isLoadingBlocks: true,
            statusMessage: {
              key: 'store.connectingDatabase',
            },
          })

          await loadSongsFromDatabase(set, get)
          set({
            isConnected: true,
            statusMessage: {
              key: 'store.databaseConnected',
            },
          })
        } catch (error) {
          set({
            isLoadingBlocks: false,
            statusMessage: {
              key: error instanceof Error ? error.message : 'store.connectFailed',
            },
          })
        }
      },
      loadSongs: async () => {
        set({
          isLoadingBlocks: true,
          statusMessage: {
            key: 'store.loadingSongs',
          },
        })

        await loadSongsFromDatabase(set, get)
      },
      loadSessions: async () => {
        set({
          isLoadingBlocks: true,
          statusMessage: {
            key: 'store.loadingSessions',
          },
        })

        await loadSessionsFromDatabase(set, get)
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
      version: 4,
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

async function loadSongsFromDatabase(
  set: (partial: Partial<AppState>) => void,
  get: () => AppState,
) {
  try {
    const response = await fetch(`${API_BASE_URL}/songs?limit=1000`)
    if (!response.ok) {
      throw new Error('Failed to fetch songs')
    }

    const songs = await response.json()
    const promptBlocks = songs.map((song: any) => convertSongToPromptBlock(song)).filter((block): block is PromptBlock => block !== null)
    const selectedPromptId = ensureSelectedPromptId(promptBlocks, get().selectedPromptId)

    set({
      isLoadingBlocks: false,
      promptBlocks,
      selectedPromptId,
      generatedSchema: null,
      schemaSourceCount: 0,
      statusMessage: {
        key: 'store.songsLoaded',
        values: { count: promptBlocks.length },
      },
    })
  } catch (error) {
    set({
      isLoadingBlocks: false,
      statusMessage: {
        key: error instanceof Error ? error.message : 'store.loadFailed',
      },
    })
  }
}

async function loadSessionsFromDatabase(
  set: (partial: Partial<AppState>) => void,
  get: () => AppState,
) {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions?limit=1000`)
    if (!response.ok) {
      throw new Error('Failed to fetch sessions')
    }

    const sessions = await response.json()
    const promptBlocks = sessions.map((session: any) => convertSessionToPromptBlock(session)).filter((block): block is PromptBlock => block !== null)
    const selectedPromptId = ensureSelectedPromptId(promptBlocks, get().selectedPromptId)

    set({
      isLoadingBlocks: false,
      promptBlocks,
      selectedPromptId,
      generatedSchema: null,
      schemaSourceCount: 0,
      statusMessage: {
        key: 'store.sessionsLoaded',
        values: { count: promptBlocks.length },
      },
    })
  } catch (error) {
    set({
      isLoadingBlocks: false,
      statusMessage: {
        key: error instanceof Error ? error.message : 'store.loadFailed',
      },
    })
  }
}

function convertSongToPromptBlock(song: any): PromptBlock | null {
  try {
    const data = song.raw_data || song
    const topLevelKeys = Object.keys(data).sort()

    return {
      id: song.id,
      fileName: `${song.title}.json`,
      relativePath: `songs/${song.id}`,
      fileNameText: song.title.toLowerCase(),
      relativePathText: `songs/${song.id}`.toLowerCase(),
      topLevelKeyText: topLevelKeys.join(' ').toLowerCase(),
      searchText: [song.title, topLevelKeys.join(' '), JSON.stringify(data)].join('\n').toLowerCase(),
      topLevelKeys,
      data,
    }
  } catch {
    return null
  }
}

function convertSessionToPromptBlock(session: any): PromptBlock | null {
  try {
    const data = session.full_payload || session
    const topLevelKeys = Object.keys(data).sort()

    return {
      id: session.id,
      fileName: `${session.title || session.id}.json`,
      relativePath: `sessions/${session.id}`,
      fileNameText: (session.title || session.id).toLowerCase(),
      relativePathText: `sessions/${session.id}`.toLowerCase(),
      topLevelKeyText: topLevelKeys.join(' ').toLowerCase(),
      searchText: [(session.title || session.id), topLevelKeys.join(' '), JSON.stringify(data)].join('\n').toLowerCase(),
      topLevelKeys,
      data,
    }
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
