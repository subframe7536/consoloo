import type { TransportFn, TransportLevel } from '../node'
import type { Keys, LogScope } from '../type'
import type { Arrayable } from '@subframe7536/type-utils'

import { appendFileSync, existsSync, mkdirSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import { _LEVEL, parseArray } from '../utils'

type LogFile<T extends LogScope> = {
  /**
   * log file path
   */
  dest: string
  /**
   * log events
   */
  level?: Arrayable<TransportLevel>
  /**
   * log scope
   */
  scope?: Keys<T>
  /**
   * max file size
   * @default 1 << 22 (4MB)
   */
  maxSize?: number
}

export type FormatterFn<T extends LogScope> = (data: Parameters<TransportFn<T>>[0]) => string

export type FileTransportOptions<T extends LogScope> = {
  /**
   * file path or arrayable {@link LogFile}
   */
  file: string | Arrayable<LogFile<T>>
  /**
   * custom formatter
   * @param data log data
   */
  formatter?: FormatterFn<T>
}
type ParsedFiles<T extends LogScope> = Record<TransportLevel, Required<Omit<LogFile<T>, 'level'>>>

function parseOptions<T extends LogScope>(file: FileTransportOptions<T>['file']): ParsedFiles<T> {
  const base = {
    maxSize: 1 << 22, // 4MB
    scope: '*' as any,
  } as any
  const parsedOption: ParsedFiles<T> = {
    debug: base,
    info: base,
    warn: base,
    error: base,
    timer: base,
  }
  if (typeof file === 'string') {
    for (const key of Object.keys(parsedOption)) {
      parsedOption[key as TransportLevel].dest = file
    }
    return parsedOption
  }
  file = parseArray(file)
  for (const { dest, level, maxSize, scope } of file) {
    const levels = level
      ? parseArray(level)
      : [..._LEVEL, 'timer'] as TransportLevel[]
    for (const l of levels) {
      parsedOption[l].dest = dest
      if (maxSize) {
        parsedOption[l].maxSize = maxSize
      }
      if (scope) {
        parsedOption[l].scope = scope
      }
    }
  }
  return parsedOption
}

function assertFileSize(file: string, maxSize: number): void {
  const stat = statSync(file)
  if (stat.size > maxSize) {
    renameSync(file, `${file}.${new Date().getTime()}.bak`)
  }
}
function assertFileExist(option: ParsedFiles<any>): void {
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
  options: FileTransportOptions<T>,
): TransportFn<T> {
  const { file, formatter } = options
  const parsedFiles = parseOptions<T>(file)
  assertFileExist(parsedFiles)
  return (data) => {
    const { dest, maxSize, scope } = parsedFiles[data.level]
    if (scope === '*' || scope === data.scope) {
      assertFileSize(dest, maxSize)
      appendFileSync(dest, `${formatter?.(data) || data.plainLog}\n`)
    }
  }
}
