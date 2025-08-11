import type { Reporter } from '../type'
import type { MessageFormatter } from './utils'
import type { Writable } from 'node:stream'

import { defaultMessageFormatter } from './utils'

export interface StreamReporterOptions<T extends string> {
  /**
   * Log time format function
   */
  timeFormat?: (date: Date) => string
  /**
   * Custom function to format log message,
   * default to {@link defaultMessageFormatter}
   */
  logMessage?: MessageFormatter<T>
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
  options: StreamReporterOptions<T>,
): Reporter<T> {
  const {
    timeFormat = (date: Date) => date.toLocaleString(),
    logMessage = defaultMessageFormatter,
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
    const message = logMessage(date, msg, level as any, scope as T, e, timeFormat)
    queue.push(message + '\n')

    if (queue.length >= flushCount) {
      flush()
    } else if (!timeout) {
      timeout = setTimeout(() => {
        flush()
      }, flushTimeout)
    }
  }
}
