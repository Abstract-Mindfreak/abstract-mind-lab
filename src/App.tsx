import {
  Actions,
  Layout,
  Model,
  TabNode,
  type IJsonTabNode,
  type ILayoutApi,
  type ITabRenderValues,
} from 'flexlayout-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { panelRegistry } from './components/panels/panelRegistry'
import { buildDefaultLayout } from './layout/defaultLayout'
import { useAppStore } from './store/useAppStore'

const PREVIEW_TAB_ID = 'json-preview-tab'
const WORKSPACE_TABSET_ID = 'workspace-tabset'

export default function App() {
  const { t } = useTranslation()
  const layoutRef = useRef<ILayoutApi | null>(null)
  const layoutSnapshot = useAppStore((state) => state.layoutSnapshot)
  const promptBlocks = useAppStore((state) => state.promptBlocks)
  const draftDocuments = useAppStore((state) => state.draftDocuments)
  const registerWorkspaceActions = useAppStore((state) => state.registerWorkspaceActions)
  const removeDraftDocument = useAppStore((state) => state.removeDraftDocument)
  const renameDraftDocument = useAppStore((state) => state.renameDraftDocument)
  const setLayoutSnapshot = useAppStore((state) => state.setLayoutSnapshot)
  const setSelectedPromptId = useAppStore((state) => state.setSelectedPromptId)
  const uiTheme = useAppStore((state) => state.uiTheme)
  const fontScale = useAppStore((state) => state.fontScale)

  const [model] = useState(() =>
    Model.fromJson(layoutSnapshot ?? buildDefaultLayout(t)),
  )

  const promptBlockMap = useMemo(
    () => new Map(promptBlocks.map((block) => [block.id, block])),
    [promptBlocks],
  )

  useEffect(() => {
    const actions = {
      openBlankEditorTab: (draftId: string) => {
        const draft = draftDocuments[draftId]

        if (!draft) {
          return
        }

        const existingTab = findTabNode(
          model,
          (node) => node.getConfig()?.mode === 'draft' && node.getConfig()?.draftId === draftId,
        )

        if (existingTab) {
          model.doAction(Actions.selectTab(existingTab.getId()))
          return
        }

        addTab(layoutRef.current, model, {
          id: `draft-tab:${draftId}`,
          type: 'tab',
          component: 'json-inspector',
          name: draft.name,
          config: {
            draftId,
            mode: 'draft',
          },
          enableClose: true,
        })
      },
      openPromptInNewTab: (promptId: string) => {
        const block = promptBlockMap.get(promptId)

        if (!block) {
          return
        }

        const existingTab = findTabNode(
          model,
          (node) => node.getConfig()?.mode === 'prompt' && node.getConfig()?.promptId === promptId,
        )

        if (existingTab) {
          model.doAction(Actions.selectTab(existingTab.getId()))
          return
        }

        addTab(layoutRef.current, model, {
          id: `prompt-tab:${promptId}`,
          type: 'tab',
          component: 'json-inspector',
          name: block.displayName,
          config: {
            mode: 'prompt',
            promptId,
          },
          enableClose: true,
        })
      },
      openPromptInPreview: (promptId: string) => {
        const previewNode = model.getNodeById(PREVIEW_TAB_ID)

        if (!previewNode) {
          return
        }

        model.doAction(
          Actions.updateNodeAttributes(PREVIEW_TAB_ID, {
            config: {
              mode: 'preview',
              promptId,
            },
          }),
        )
        model.doAction(Actions.selectTab(PREVIEW_TAB_ID))
      },
    }

    registerWorkspaceActions(actions)

    return () => {
      registerWorkspaceActions(null)
    }
  }, [draftDocuments, model, promptBlockMap, registerWorkspaceActions])

  const factory = (node: TabNode) => {
    const component = node.getComponent() ?? ''
    const Panel = panelRegistry[component]

    if (!Panel) {
      return (
        <div className="p-4 text-sm text-slate-300">
          <Trans i18nKey="app.unknownPanel" values={{ component }} />
        </div>
      )
    }

    return <Panel node={node} />
  }

  const onRenderTab = (node: TabNode, renderValues: ITabRenderValues) => {
    const component = node.getComponent() ?? ''
    const accentClass = tabAccentClassByComponent[component]

    if (accentClass) {
      renderValues.content = (
        <span className={`aml-tab-accent ${accentClass}`}>{renderValues.content}</span>
      )
    }
  }

  return (
    <main
      className={`aml-app aml-theme-${uiTheme} aml-font-${fontScale} h-screen w-screen overflow-hidden bg-slate-950 text-slate-100`}
    >
      <Layout
        factory={factory}
        model={model}
        onAction={(action) => {
          if (action.type === Actions.DELETE_TAB) {
            const tabNode = model.getNodeById(String(action.data.node)) as TabNode | undefined
            const config = tabNode?.getConfig()

            if (config?.mode === 'draft' && typeof config.draftId === 'string') {
              removeDraftDocument(config.draftId)
            }
          }

          return action
        }}
        onAuxMouseClick={(node, event) => {
          if (event.button !== 1 || !(node instanceof TabNode)) {
            return
          }

          if (node.getId() === PREVIEW_TAB_ID) {
            const selectedPromptId = useAppStore.getState().selectedPromptId

            if (selectedPromptId) {
              useAppStore.getState().openPromptInNewTab(selectedPromptId)
            }
          }
        }}
        onModelChange={(nextModel, action) => {
          if (action.type === Actions.RENAME_TAB) {
            const renamedNode = nextModel.getNodeById(String(action.data.node)) as TabNode | undefined
            const config = renamedNode?.getConfig()

            if (config?.mode === 'draft' && typeof config.draftId === 'string') {
              renameDraftDocument(config.draftId, String(action.data.text ?? renamedNode?.getName() ?? ''))
            }
          }

          if (action.type === Actions.SELECT_TAB) {
            const selectedNode = nextModel.getNodeById(String(action.data.tabNode)) as TabNode | undefined
            const config = selectedNode?.getConfig()

            if (config?.mode === 'prompt' && typeof config.promptId === 'string') {
              setSelectedPromptId(config.promptId)
            }

            if (selectedNode?.getId() === PREVIEW_TAB_ID && typeof config?.promptId === 'string') {
              setSelectedPromptId(config.promptId)
            }
          }

          setLayoutSnapshot(nextModel.toJson())
        }}
        onRenderTab={onRenderTab}
        onRenderTabSet={(_tabSetNode, renderValues) => {
          renderValues.buttons.push(
            <button
              className="aml-tabset-add nodrag"
              key="add-editor-tab"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                useAppStore.getState().openBlankEditorTab()
              }}
              title={t('workspace.addTab')}
              type="button"
            >
              +
            </button>,
          )
        }}
        popoutClassName={`aml-popout aml-theme-${uiTheme} aml-font-${fontScale}`}
        ref={layoutRef}
      />
    </main>
  )
}

function addTab(layout: ILayoutApi | null, model: Model, tab: IJsonTabNode) {
  const added = layout?.addTabToTabSet(WORKSPACE_TABSET_ID, tab)

  if (added) {
    model.doAction(Actions.selectTab(added.getId()))
  }
}

function findTabNode(model: Model, predicate: (node: TabNode) => boolean) {
  let found: TabNode | undefined

  model.visitNodes((node) => {
    const candidate = node as TabNode

    if (found || typeof candidate.getComponent !== 'function') {
      return
    }

    if (predicate(candidate)) {
      found = candidate
    }
  })

  return found
}

const tabAccentClassByComponent: Record<string, string> = {
  'diff-analytics': 'aml-tab-accent-diff',
  'graph-canvas': 'aml-tab-accent-graph',
  'json-inspector': 'aml-tab-accent-json',
  'prompt-list': 'aml-tab-accent-prompt',
  'terminal-panel': 'aml-tab-accent-terminal',
  'workspace-settings': 'aml-tab-accent-settings',
}
