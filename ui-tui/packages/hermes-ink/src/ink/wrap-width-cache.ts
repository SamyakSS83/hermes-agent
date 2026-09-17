import { lruEvict } from './lru.js'
import rawStringWidth from './vendor/string-width.js'

// Separate from Ink.stringWidth: wrap-ansi 9 uses string-width 7 semantics.
const widths = new Map<string, number>()
const MAX_ENTRIES = 8192
const MAX_KEY_UNITS = 1024
const MAX_RETAINED_UNITS = 256 * 1024
let retainedUnits = 0

export function evictWrapWidthCache(keepRatio = 0): void {
  lruEvict(widths, keepRatio)
  retainedUnits = 0

  for (const text of widths.keys()) {
    retainedUnits += text.length
  }
}

export function wrapStringWidth(text: string): number {
  if (!text) {
    return 0
  }

  if (text.length > MAX_KEY_UNITS) {
    return rawStringWidth(text)
  }

  const cached = widths.get(text)

  if (cached !== undefined) {
    widths.delete(text)
    widths.set(text, cached)

    return cached
  }

  const width = rawStringWidth(text)

  while (widths.size >= MAX_ENTRIES || retainedUnits + text.length > MAX_RETAINED_UNITS) {
    const oldest = widths.keys().next().value!
    retainedUnits -= oldest.length
    widths.delete(oldest)
  }

  widths.set(text, width)
  retainedUnits += text.length

  return width
}
