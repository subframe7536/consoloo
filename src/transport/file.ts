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

export type FormatterFn<T extends LogScope = string> = (data: Parameters<TransportFn<T>>[0]) => string

export type FileTransportOptions<T extends LogScope = string> = {
  /**
   * file path or arrayable {@link LogFile}
   */
  file: string | Arrayable<LogFile>
  /**
   * custom formatter
   * @param data log data
   */
  formatter?: FormatterFn<T>
}
type ParsedFiles = Record<TransportLevel, Required<Omit<LogFile, 'level'>>>

function parseOptions(file: FileTransportOptions['file']): ParsedFiles {
  const base = {
    dest: '',
    maxSize: 1 << 22, // 4MB
  }
  const parsedOption: ParsedFiles = {
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
  file = Array.isArray(file) ? file : [file]
  for (const { dest, level, maxSize } of file) {
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
function assertFileExist(option: ParsedFiles) {
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
  const parsedFiles = parseOptions(file)
  assertFileExist(parsedFiles)
  return (data) => {
    const { dest, maxSize } = parsedFiles[data.level]
    assertFileSize(dest, maxSize)
    appendFileSync(dest, `${formatter?.(data) || data.plainLog}\n`)
  }
}
