export type PromptBlockData = Record<string, unknown>

export type PromptMetaEntry = {
  mmss_type?: string | null
  size?: number
  smart_name?: string
  top_level_keys?: string[]
}

export type MetaSummary = {
  files_manifest: Record<string, PromptMetaEntry>
  global_stats: {
    key_path_frequency: Record<string, number>
    total_files: number
  }
}

export type PromptBlock = {
  id: string
  displayName: string
  fileName: string
  mmssType: string | null
  relativePath: string
  searchText: string
  sizeBytes: number | null
  fileNameText: string
  relativePathText: string
  topLevelKeyText: string
  topLevelKeys: string[]
  data: PromptBlockData
}

type JsonFileEntry = {
  fileName: string
  relativePath: string
  rawText: string
}

export function getValueByPath(source: unknown, path: string): unknown {
  if (!path.trim()) {
    return undefined
  }

  return path
    .split('.')
    .filter(Boolean)
    .reduce<unknown>((current, key) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key]
      }

      return undefined
    }, source)
}

export function buildPromptBlock(entry: JsonFileEntry, meta?: PromptMetaEntry): PromptBlock | null {
  try {
    const parsed = JSON.parse(entry.rawText) as unknown

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null
    }

    const data = parsed as PromptBlockData
    const topLevelKeys =
      meta?.top_level_keys && meta.top_level_keys.length > 0
        ? [...meta.top_level_keys].sort()
        : Object.keys(data).sort()
    const displayName = meta?.smart_name?.trim() || entry.fileName
    const mmssType = meta?.mmss_type?.trim() || inferMmssType(data)

    return {
      id: entry.relativePath,
      displayName,
      fileName: entry.fileName,
      mmssType,
      relativePath: entry.relativePath,
      sizeBytes: typeof meta?.size === 'number' ? meta.size : entry.rawText.length,
      fileNameText: entry.fileName.toLowerCase(),
      relativePathText: entry.relativePath.toLowerCase(),
      topLevelKeyText: topLevelKeys.join(' ').toLowerCase(),
      searchText: [displayName, mmssType, entry.fileName, entry.relativePath, topLevelKeys.join(' '), entry.rawText]
        .join('\n')
        .toLowerCase(),
      topLevelKeys,
      data,
    }
  } catch {
    return null
  }
}

export function filterPromptBlocks(blocks: PromptBlock[], query: string) {
  return searchPromptBlocks(blocks, query)
}

export function searchPromptBlocks(blocks: PromptBlock[], query: string) {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return blocks
  }

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean)

  return blocks
    .map((block) => ({
      block,
      score: scorePromptBlock(block, tokens),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.block.fileName.localeCompare(b.block.fileName))
    .map((entry) => entry.block)
}

export function groupPromptBlocks(blocks: PromptBlock[], keyPath: string) {
  const normalizedPath = keyPath.trim()
  const groups = new Map<string, PromptBlock[]>()

  if (!normalizedPath) {
    groups.set('All Blocks', blocks)
    return groups
  }

  for (const block of blocks) {
    const value = getValueByPath(block.data, normalizedPath)
    const label = formatGroupLabel(value)
    const existing = groups.get(label)

    if (existing) {
      existing.push(block)
    } else {
      groups.set(label, [block])
    }
  }

  return new Map([...groups.entries()].sort((a, b) => b[1].length - a[1].length))
}

export function collectGroupablePaths(blocks: PromptBlock[]) {
  const pathUsage = new Map<string, number>()

  for (const block of blocks) {
    collectPaths(block.data, '', pathUsage)
  }

  return [...pathUsage.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([path]) => path)
}

export function getGroupablePathsFromMetaSummary(metaSummary: MetaSummary | null) {
  if (!metaSummary) {
    return []
  }

  return Object.entries(metaSummary.global_stats.key_path_frequency)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([path]) => path)
}

function collectPaths(value: unknown, prefix: string, pathUsage: Map<string, number>) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const nextPath = prefix ? `${prefix}.${key}` : key
    pathUsage.set(nextPath, (pathUsage.get(nextPath) ?? 0) + 1)

    if (nestedValue && typeof nestedValue === 'object' && !Array.isArray(nestedValue)) {
      collectPaths(nestedValue, nextPath, pathUsage)
    }
  }
}

function scorePromptBlock(block: PromptBlock, tokens: string[]) {
  let score = 0

  for (const token of tokens) {
    let tokenScore = 0

    if (block.displayName.toLowerCase() === token) {
      tokenScore += 140
    } else if (block.displayName.toLowerCase().startsWith(token)) {
      tokenScore += 96
    } else if (block.displayName.toLowerCase().includes(token)) {
      tokenScore += 64
    }

    if (block.fileNameText === token) {
      tokenScore += 120
    } else if (block.fileNameText.startsWith(token)) {
      tokenScore += 80
    } else if (block.fileNameText.includes(token)) {
      tokenScore += 50
    }

    if (block.relativePathText === token) {
      tokenScore += 100
    } else if (block.relativePathText.includes(token)) {
      tokenScore += 40
    }

    if (block.topLevelKeyText.includes(token)) {
      tokenScore += 24
    }

    if (block.searchText.includes(`"${token}"`)) {
      tokenScore += 16
    } else if (block.searchText.includes(token)) {
      tokenScore += 8
    }

    if (tokenScore === 0) {
      return 0
    }

    score += tokenScore
  }

  return score
}

function formatGroupLabel(value: unknown) {
  if (value === undefined) {
    return 'undefined'
  }

  if (value === null) {
    return 'null'
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

function inferMmssType(data: PromptBlockData) {
  const payloadType = getValueByPath(data, 'payload.type')
  const category = getValueByPath(data, 'category')
  const architecture = getValueByPath(data, 'data.architecture')

  if (typeof payloadType === 'string' && payloadType.trim()) {
    return payloadType
  }

  if (typeof category === 'string' && category.trim()) {
    return category
  }

  if (typeof architecture === 'string' && architecture.trim()) {
    return architecture
  }

  return null
}
