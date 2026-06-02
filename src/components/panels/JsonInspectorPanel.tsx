import Editor from '@monaco-editor/react'
import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useAppStore } from '../../store/useAppStore'
import type { PanelProps } from './types'

export function JsonInspectorPanel({ node }: PanelProps) {
  const { t } = useTranslation()
  const selectedPromptId = useAppStore((state) => state.selectedPromptId)
  const generatedSchema = useAppStore((state) => state.generatedSchema)
  const schemaSourceCount = useAppStore((state) => state.schemaSourceCount)
  const selectedPrompt = useAppStore((state) =>
    state.promptBlocks.find((block) => block.id === state.selectedPromptId) ?? null,
  )
  const inspectorValue = useMemo(
    () =>
      JSON.stringify(
        generatedSchema
          ? generatedSchema
          : selectedPrompt
            ? {
                id: selectedPromptId,
                fileName: selectedPrompt.fileName,
                relativePath: selectedPrompt.relativePath,
                data: selectedPrompt.data,
              }
            : { status: t('jsonInspector.emptyState') },
        null,
        2,
      ),
    [generatedSchema, selectedPrompt, selectedPromptId, t],
  )

  return (
    <section className="panel-shell">
      <div className="panel-card flex h-full min-h-[320px] flex-col gap-4">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.24em] text-sky-300/80">{node.getName()}</p>
          <h2 className="text-xl font-semibold text-slate-50">
            <Trans t={t} i18nKey="jsonInspector.title" />
          </h2>
        </header>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
          {generatedSchema ? (
            <>
              <div className="font-medium text-slate-100">
                <Trans t={t} i18nKey="jsonInspector.schemaTitle" />
              </div>
              <div className="text-xs text-slate-500">
                <Trans
                  t={t}
                  i18nKey="jsonInspector.schemaDescription"
                  values={{ count: schemaSourceCount }}
                />
              </div>
            </>
          ) : selectedPrompt ? (
            <>
              <div className="font-medium text-slate-100">{selectedPrompt.fileName}</div>
              <div className="text-xs text-slate-500">{selectedPrompt.relativePath}</div>
            </>
          ) : (
            <div className="text-slate-400">
              <Trans t={t} i18nKey="jsonInspector.empty" />
            </div>
          )}
        </div>

        <div className="min-h-[360px] flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
          <Editor
            defaultLanguage="json"
            height="100%"
            options={{
              automaticLayout: true,
              fontSize: 13,
              formatOnPaste: false,
              formatOnType: false,
              glyphMargin: false,
              lineNumbersMinChars: 3,
              minimap: { enabled: false },
              padding: { top: 16, bottom: 16 },
              readOnly: true,
              renderLineHighlight: 'gutter',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
            }}
            theme="vs-dark"
            value={inspectorValue}
          />
        </div>
      </div>
    </section>
  )
}
