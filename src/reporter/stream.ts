import type { Reporter } from '../type'
import type { Writable } from 'node:stream'

export interface StreamReporterOptions {
  /**
   * Log time format function
   */
  timeFormat?: (date: Date) => string
  /**
   * Flush queue when it reaches this count
   * @default 100
   */
  flushCount?: number
  /**
   * Auto flush timeout in ms
   * @default 1000
   */
  flushTimeout?: number
  /**
   * Writable stream for log output
   */
  stream: Writable
}

/**
 * Creates a stream-based reporter for logging messages to a writable stream.
 *
 * @param options - {@link StreamReporterOptions Configuration} for the stream reporter
 *
 */
export function createStreamReporter<T extends string>(
  options: StreamReporterOptions,
): Reporter<T> {
  const {
    timeFormat = (date: Date) => date.toLocaleString(),
    flushCount = 100,
    flushTimeout = 1000,
    stream,
  } = options

  const queue: string[] = []
  let timeout: NodeJS.Timeout | null = null

  function clearTimeout(): void {
    if (timeout) {
      globalThis.clearTimeout(timeout)
      timeout = null
    }
  }

  async function flush(): Promise<void> {
    clearTimeout()
    if (stream.writable) {
      stream.write(queue.join(''))
      // clear queue
      queue.length = 0
    }
  }

  return (date, msg, level, scope, e) => {
    const timestamp = timeFormat(date)
    const list = [timestamp, level.toUpperCase()]
    if (scope) {
      list.push(scope)
    }
    list.push(msg)
    let logMessage = list.join(' | ')
    if (e) {
      logMessage += `\n${e.message}\n${e.stack}`
    }

    queue.push(`${logMessage}\n`)

    if (queue.length >= flushCount) {
      flush()
    } else if (!timeout) {
      timeout = setTimeout(() => {
        flush()
      }, flushTimeout)
    }
  }
}
