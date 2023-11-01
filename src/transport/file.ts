import { appendFileSync, existsSync, mkdirSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { Arrayable } from '@subframe7536/type-utils'
import type { TransportFn, TransportLevel } from '../node'
import type { LogScope } from '../type'

type LogFile = {
  /**
   * log file path
   */
  dest: string
  /**
   * log events
   */
  level?: Arrayable<TransportLevel>
  /**
   * max file size
   * @default 1 << 22 (4MB)
   */
  maxSize?: number
}
export type FilePathOrTransportOptions = string | Arrayable<LogFile>
type ParsedOption = Record<TransportLevel, Required<Omit<LogFile, 'level'>>>

function parseOptions(options: FilePathOrTransportOptions): ParsedOption {
  const base = {
    dest: '',
    maxSize: 1 << 22, // 4MB
  }
  const parsedOption: ParsedOption = {
    debug: base,
    info: base,
    warn: base,
    error: base,
    timer: base,
  }
  if (typeof options === 'string') {
    for (const key of Object.keys(parsedOption)) {
      parsedOption[key as TransportLevel].dest = options
    }
    return parsedOption
  }
  if (!Array.isArray(options)) {
    options = [options]
  }
  for (let { dest, level, maxSize } of options) {
    const levels = level
      ? Array.isArray(level)
        ? level
        : [level]
      : ['debug', 'info', 'warn', 'error', 'timer'] as TransportLevel[]
    for (const l of levels) {
      parsedOption[l].dest = dest
      if (maxSize) {
        parsedOption[l].maxSize = maxSize
      }
    }
  }
  return parsedOption
}

function assertFileSize(file: string, maxSize: number) {
  const stat = statSync(file)
  if (stat.size > maxSize) {
    renameSync(file, `${file}.${new Date().getTime()}.bak`)
  }
}
function assertFileExist(option: ParsedOption) {
  for (const { dest } of Object.values(option)) {
    const dir = dirname(dest)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    if (!existsSync(dest)) {
      writeFileSync(dest, '')
    }
  }
}

export function createFileTransport<T extends LogScope>(
  dest: FilePathOrTransportOptions,
): TransportFn<T> {
  const options = parseOptions(dest)
  assertFileExist(options)
  return ({ plainLog, level }) => {
    const { dest, maxSize } = options[level]
    assertFileSize(dest, maxSize)
    appendFileSync(dest, `${plainLog}\n`)
  }
}
