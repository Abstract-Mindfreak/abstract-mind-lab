export type PromptBlockData = Record<string, unknown>

export type PromptBlock = {
  id: string
  fileName: string
  relativePath: string
  searchText: string
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

export function buildPromptBlock(entry: JsonFileEntry): PromptBlock | null {
  try {
    const parsed = JSON.parse(entry.rawText) as unknown

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null
    }

    const data = parsed as PromptBlockData
    const topLevelKeys = Object.keys(data).sort()

    return {
      id: entry.relativePath,
      fileName: entry.fileName,
      relativePath: entry.relativePath,
      fileNameText: entry.fileName.toLowerCase(),
      relativePathText: entry.relativePath.toLowerCase(),
      topLevelKeyText: topLevelKeys.join(' ').toLowerCase(),
      searchText: [entry.fileName, entry.relativePath, topLevelKeys.join(' '), entry.rawText]
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
