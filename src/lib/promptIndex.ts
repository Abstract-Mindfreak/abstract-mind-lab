export type PromptBlockData = Record<string, unknown>

export type PromptBlock = {
  id: string
  fileName: string
  relativePath: string
  searchText: string
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
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return blocks
  }

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean)
  return blocks.filter((block) => tokens.every((token) => block.searchText.includes(token)))
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
  const paths = new Set<string>()

  for (const block of blocks) {
    collectPaths(block.data, '', paths)
  }

  return [...paths].sort((a, b) => a.localeCompare(b))
}

function collectPaths(value: unknown, prefix: string, paths: Set<string>) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const nextPath = prefix ? `${prefix}.${key}` : key
    paths.add(nextPath)

    if (nestedValue && typeof nestedValue === 'object' && !Array.isArray(nestedValue)) {
      collectPaths(nestedValue, nextPath, paths)
    }
  }
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
