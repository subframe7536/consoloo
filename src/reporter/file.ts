import type { LogLevel, Reporter } from '../type'

import { appendFileSync, existsSync, mkdirSync, renameSync, statSync } from 'node:fs'
import { join } from 'node:path'

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
  } = options

  const fileMap = new Map<string, string>()
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

  function getPath(level: LogLevel | 'timer', scope?: string): string {
    const name = join(logDir, getLogFileName(level, scope as T))

    const paramKey = `${level}:${scope}`
    let filePath = fileMap.get(paramKey)
    if (!filePath) {
      filePath = name + '.log'
      fileMap.set(paramKey, filePath)
    }
    try {
      const stats = statSync(filePath)
      if (stats.size >= maxBytes) {
        rotateFile(i => i ? name + '.' + i + '.log' : filePath)
      }
    } catch (e) {
      if ((e as { code: string }).code !== 'ENOENT') {
        throw e
      }
    }
    return filePath
  }

  return (date, msg, level, scope, e) => {
    const timestamp = timeFormat(date)
    const filePath = getPath(level, scope)

    const list = [timestamp, level.toUpperCase()]
    if (scope) {
      list.push(scope)
    }
    list.push(msg)
    let logMessage = list.join(' | ')
    if (e) {
      logMessage += `\n${e.message}\n${e.stack}`
    }

    appendFileSync(filePath, logMessage + '\n')
  }
}
