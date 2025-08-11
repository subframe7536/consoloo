import type { LogLevel, Reporter } from '../type'
import type { MessageFormatter } from './utils'

import {
  closeSync,
  existsSync,
  fstatSync,
  mkdirSync,
  openSync,
  renameSync,
  writeSync,
} from 'node:fs'
import { join } from 'node:path'

import { defaultMessageFormatter } from './utils'

export interface FileReporterOptions<T extends string> {
  /**
   * Log directory path
   * @default './logs'
   */
  logDir?: string
  /**
   * Max file size in `MB` before rotation
   * @default 10
   */
  maxSize?: number
  /**
   * Number of backup files to keep
   * @default 50
   */
  maxBackups?: number
  /**
   * Time format for log entries
   * @default data => data.toLocaleString()
   */
  timeFormat?: (date: Date) => string
  /**
   * Custom function to generate log file name (WITHOUT extension)
   * @default () => 'app'
   * @example
   * ```ts
   * getLogFileName: (level, scope) => `app-${level}-${scope}`
   * ```
   */
  getLogFileName?: (level: LogLevel | 'timer', scope?: T) => string
  /**
   * Custom function to format log message,
   * default to {@link defaultMessageFormatter}
   */
  logMessage?: MessageFormatter<T>
}

/**
 * Creates a file-based reporter for logging messages to files with rotation capabilities.
 *
 * @param options - {@link FileReporterOptions Configuration} for the file reporter
 *
 * The reporter:
 * - Creates log directory if it doesn't exist
 * - Rotates log files when they exceed maxSize
 * - Maintains separate log files based on level and scope
 *
 * Log file names are generated using `getLogFileName(level, scope) + '.log'`.
 * Rotated files have numbers appended: `filename.1.log`, `filename.2.log`, etc.
 */
export function createFileReporter<T extends string>(
  options: FileReporterOptions<T> = {},
): Reporter<T> {
  const {
    logDir = './logs',
    maxSize = 1,
    maxBackups = 50,
    timeFormat = (date: Date) => date.toLocaleString(),
    getLogFileName = () => 'app',
    logMessage = defaultMessageFormatter,
  } = options

  interface FileInfo {
    path: string
    fd: number
    size: number
  }

  const fileMap = new Map<string, FileInfo>()
  const maxBytes = maxSize << 20 // Convert MB to bytes

  // Ensure log directory exists once at initialization
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true })
  }

  function rotateFile(get: (count?: number) => string): void {
    for (let i = maxBackups - 1; i >= 0; i--) {
      const source = i === 0 ? get() : get(i)
      const target = get(i + 1)
      if (existsSync(source)) {
        renameSync(source, target)
      }
    }
  }

  function getFileInfo(level: LogLevel | 'timer', scope?: T): FileInfo {
    const paramKey = level + ':' + scope
    const existingInfo = fileMap.get(paramKey)

    // Rotate if size exceeds the limit
    if (existingInfo && existingInfo.size >= maxBytes) {
      closeSync(existingInfo.fd)
      rotateFile(i => existingInfo.path + (i ? ('.' + i) : '') + '.log')
      fileMap.delete(paramKey)
    }

    // Get fresh info if it doesn't exist or was deleted
    let info = fileMap.get(paramKey)
    if (!info) {
      const path = join(logDir, getLogFileName(level, scope))
      const fd = openSync(path + '.log', 'a')
      try {
        const { size } = fstatSync(fd)
        info = { path, fd, size }
        fileMap.set(paramKey, info)
      } catch (e) {
        closeSync(fd)
        throw e
      }
    }

    return info
  }

  return (date, msg, level, scope, e) => {
    const info = getFileInfo(level, scope as T)
    const message = logMessage(date, msg, level as any, scope as T, e, timeFormat) + '\n'
    info.size += writeSync(info.fd, Buffer.from(message))
  }
}
