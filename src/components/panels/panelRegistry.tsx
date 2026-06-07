import type { ComponentType } from 'react'
import { DiffAnalyticsPanel } from './DiffAnalyticsPanel'
import { GraphCanvasPanel } from './GraphCanvasPanel'
import { JsonInspectorPanel } from './JsonInspectorPanel'
import { PromptListPanel } from './PromptListPanel'
import { BlockImportPanel } from './BlockImportPanel'
import { BlocksTreeTable } from './BlocksTreeTable'
import type { PanelProps } from './types'

export const panelRegistry: Record<string, ComponentType<PanelProps>> = {
  'diff-analytics': DiffAnalyticsPanel,
  'graph-canvas': GraphCanvasPanel,
  'json-inspector': JsonInspectorPanel,
  'prompt-list': PromptListPanel,
  'block-import': BlockImportPanel,
  'blocks-tree': BlocksTreeTable,
}
