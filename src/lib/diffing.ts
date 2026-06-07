import { create, type Delta } from 'jsondiffpatch'
import type { PromptBlock } from './promptIndex'

const diffPatcher = create({
  objectHash: (value) => JSON.stringify(value),
})

export type DiffSelection = {
  sourceId: string
  sourceLabel: string
  sourcePath: string
  targetId: string
  targetLabel: string
  targetPath: string
  delta: Delta | null
}

export function buildPromptDiff(source: PromptBlock, target: PromptBlock): DiffSelection {
  return {
    sourceId: source.id,
    sourceLabel: source.fileName,
    sourcePath: source.relativePath,
    targetId: target.id,
    targetLabel: target.fileName,
    targetPath: target.relativePath,
    delta: diffPatcher.diff(source.data, target.data) ?? null,
  }
}
