import { useAppStore } from '../../store/useAppStore'
import type { PanelProps } from './types'

export function JsonInspectorPanel({ node }: PanelProps) {
  const selectedPromptId = useAppStore((state) => state.selectedPromptId)
  const selectedPrompt = useAppStore((state) =>
    state.promptBlocks.find((block) => block.id === state.selectedPromptId) ?? null,
  )

  return (
    <section className="panel-shell">
      <div className="panel-card space-y-4">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.24em] text-sky-300/80">{node.getName()}</p>
          <h2 className="text-xl font-semibold text-slate-50">JSON inspector</h2>
        </header>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
          {selectedPrompt ? (
            <>
              <div className="font-medium text-slate-100">{selectedPrompt.fileName}</div>
              <div className="text-xs text-slate-500">{selectedPrompt.relativePath}</div>
            </>
          ) : (
            <div className="text-slate-400">No prompt selected yet.</div>
          )}
        </div>

        <pre className="overflow-auto rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-300">
          {JSON.stringify(
            selectedPrompt
              ? {
                  id: selectedPromptId,
                  fileName: selectedPrompt.fileName,
                  relativePath: selectedPrompt.relativePath,
                  data: selectedPrompt.data,
                }
              : { status: 'No prompt selected yet' },
            null,
            2,
          )}
        </pre>
      </div>
    </section>
  )
}
