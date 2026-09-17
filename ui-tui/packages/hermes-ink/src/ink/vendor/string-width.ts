/*!
MIT License

Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/
// string-width 7.2.0; see README.md for provenance.
import emojiRegex from 'emoji-regex'
import { eastAsianWidth } from 'get-east-asian-width'
import stripAnsi from 'strip-ansi'

const segmenter = new Intl.Segmenter()

const defaultIgnorableCodePointRegex = /^\p{Default_Ignorable_Code_Point}$/u

export default function stringWidth(
  string: string,
  options: { ambiguousIsNarrow?: boolean; countAnsiEscapeCodes?: boolean } = {}
) {
  if (typeof string !== 'string' || string.length === 0) {
    return 0
  }

  const { ambiguousIsNarrow = true, countAnsiEscapeCodes = false } = options

  if (!countAnsiEscapeCodes) {
    string = stripAnsi(string)
  }

  if (string.length === 0) {
    return 0
  }

  let width = 0
  const eastAsianWidthOptions = { ambiguousAsWide: !ambiguousIsNarrow }

  for (const { segment: character } of segmenter.segment(string)) {
    const codePoint = character.codePointAt(0)!

    // Ignore control characters
    if (codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f)) {
      continue
    }

    // Ignore zero-width characters
    if (
      (codePoint >= 0x20_0b && codePoint <= 0x20_0f) || // Zero-width space, non-joiner, joiner, left-to-right mark, right-to-left mark
      codePoint === 0xfe_ff // Zero-width no-break space
    ) {
      continue
    }

    // Ignore combining characters
    if (
      (codePoint >= 0x3_00 && codePoint <= 0x3_6f) || // Combining diacritical marks
      (codePoint >= 0x1a_b0 && codePoint <= 0x1a_ff) || // Combining diacritical marks extended
      (codePoint >= 0x1d_c0 && codePoint <= 0x1d_ff) || // Combining diacritical marks supplement
      (codePoint >= 0x20_d0 && codePoint <= 0x20_ff) || // Combining diacritical marks for symbols
      (codePoint >= 0xfe_20 && codePoint <= 0xfe_2f) // Combining half marks
    ) {
      continue
    }

    // Ignore surrogate pairs
    if (codePoint >= 0xd8_00 && codePoint <= 0xdf_ff) {
      continue
    }

    // Ignore variation selectors
    if (codePoint >= 0xfe_00 && codePoint <= 0xfe_0f) {
      continue
    }

    // This covers some of the above cases, but we still keep them for performance reasons.
    if (defaultIgnorableCodePointRegex.test(character)) {
      continue
    }

    // TODO: Use `/\p{RGI_Emoji}/v` when targeting Node.js 20.
    if (emojiRegex().test(character)) {
      width += 2

      continue
    }

    width += eastAsianWidth(codePoint, eastAsianWidthOptions)
  }

  return width
}
