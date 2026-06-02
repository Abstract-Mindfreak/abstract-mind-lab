import { create, type Delta } from 'jsondiffpatch'
import type { PromptBlock } from './promptIndex'

const diffPatcher = create({
  objectHash: (value) => JSON.stringify(value),
})

export type PairDiffSelection = {
  kind: 'pair'
  sourceId: string
  sourceLabel: string
  sourcePath: string
  targetId: string
  targetLabel: string
  targetPath: string
  delta: Delta | null
}

export type MultiDiffSelection = {
  kind: 'multi'
  items: Array<{
    id: string
    label: string
    path: string
    topLevelKeys: string[]
  }>
}

export type DiffSelection = PairDiffSelection | MultiDiffSelection

export function buildPromptDiff(source: PromptBlock, target: PromptBlock): PairDiffSelection {
  return {
    kind: 'pair',
    sourceId: source.id,
    sourceLabel: source.displayName,
    sourcePath: source.relativePath,
    targetId: target.id,
    targetLabel: target.displayName,
    targetPath: target.relativePath,
    delta: diffPatcher.diff(source.data, target.data) ?? null,
  }
}

export function buildMultiPromptSelection(blocks: PromptBlock[]): MultiDiffSelection {
  return {
    kind: 'multi',
    items: blocks.map((block) => ({
      id: block.id,
      label: block.displayName,
      path: block.relativePath,
      topLevelKeys: block.topLevelKeys,
    })),
  }
}
