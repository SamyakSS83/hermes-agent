import wrapAnsiJavaScript, { type WrapAnsiOptions } from './vendor/wrap-ansi.js'

const wrapAnsiBun = typeof Bun !== 'undefined' && typeof Bun.wrapAnsi === 'function' ? Bun.wrapAnsi : null

const wrapAnsi: (input: string, columns: number, options?: WrapAnsiOptions) => string =
  wrapAnsiBun ?? wrapAnsiJavaScript

export { wrapAnsi }
