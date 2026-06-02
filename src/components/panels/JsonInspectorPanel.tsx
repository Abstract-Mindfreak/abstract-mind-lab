import Editor from '@monaco-editor/react'
import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'
import type { PanelProps } from './types'

type InspectorMode = 'preview' | 'prompt' | 'draft' | 'selection'

export function JsonInspectorPanel({ node }: PanelProps) {
  const { t } = useTranslation()
  const config = (node.getConfig() ?? {}) as {
    draftId?: string
    mode?: InspectorMode
    promptId?: string
  }
  const fontScale = useAppStore((state) => state.fontScale)
  const generatedSchema = useAppStore((state) => state.generatedSchema)
  const draftDocuments = useAppStore((state) => state.draftDocuments)
  const promptBlocks = useAppStore((state) => state.promptBlocks)
  const schemaSourceCount = useAppStore((state) => state.schemaSourceCount)
  const selectedPromptId = useAppStore((state) => state.selectedPromptId)
  const upsertDraftDocument = useAppStore((state) => state.upsertDraftDocument)

  const mode = config.mode ?? 'selection'
  const resolvedPromptId =
    mode === 'preview' || mode === 'selection' ? selectedPromptId : config.promptId ?? null
  const selectedPrompt =
    promptBlocks.find((block) => block.id === resolvedPromptId) ?? null
  const draftDocument = config.draftId ? draftDocuments[config.draftId] : null

  const inspectorValue = useMemo(() => {
    if (mode === 'draft') {
      return draftDocument?.content ?? '{\n  \n}'
    }

    if (mode === 'selection' && generatedSchema) {
      return JSON.stringify(generatedSchema, null, 2)
    }

    if (selectedPrompt) {
      return JSON.stringify(
        {
          id: selectedPrompt.id,
          fileName: selectedPrompt.fileName,
          relativePath: selectedPrompt.relativePath,
          data: selectedPrompt.data,
        },
        null,
        2,
      )
    }

    return JSON.stringify({ status: t('jsonInspector.emptyState') }, null, 2)
  }, [draftDocument?.content, generatedSchema, mode, selectedPrompt, t])

  const headerMeta = (() => {
    if (mode === 'draft') {
      return {
        title: draftDocument?.name ?? node.getName(),
        subtitle: t('jsonInspector.draftSubtitle'),
      }
    }

    if (mode === 'selection' && generatedSchema) {
      return {
        title: t('jsonInspector.schemaTitle'),
        subtitle: t('jsonInspector.schemaDescription', { count: schemaSourceCount }),
      }
    }

    if (selectedPrompt) {
      return {
        title: selectedPrompt.displayName,
        subtitle: selectedPrompt.relativePath,
      }
    }

    return {
      title: t('jsonInspector.title'),
      subtitle: t('jsonInspector.empty'),
    }
  })()

  return (
    <section className="panel-shell">
      <div className="panel-card flex h-full min-h-[320px] flex-col gap-4">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.24em] text-sky-300/80">{node.getName()}</p>
          <h2 className="text-xl font-semibold text-slate-50">{headerMeta.title}</h2>
          <p className="text-sm text-slate-400">{headerMeta.subtitle}</p>
        </header>

        <div className="min-h-[360px] flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
          <Editor
            defaultLanguage="json"
            height="100%"
            onChange={(value) => {
              if (mode === 'draft' && draftDocument) {
                upsertDraftDocument({
                  ...draftDocument,
                  content: value ?? '',
                })
              }
            }}
            options={{
              automaticLayout: true,
              fontSize: fontScale === 'x-small' ? 11 : fontScale === 'large' ? 15 : 13,
              formatOnPaste: false,
              formatOnType: false,
              glyphMargin: false,
              lineNumbersMinChars: 3,
              minimap: { enabled: false },
              padding: { top: 16, bottom: 16 },
              readOnly: mode !== 'draft',
              renderLineHighlight: 'gutter',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
            }}
            theme="vs-dark"
            value={inspectorValue}
          />
        </div>

        {mode === 'draft' ? (
          <div className="rounded-2xl border border-violet-400/20 bg-violet-400/5 p-3 text-xs text-violet-100/85">
            <Trans t={t} i18nKey="jsonInspector.draftHint" />
          </div>
        ) : null}
      </div>
    </section>
  )
}
