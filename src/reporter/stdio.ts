import type { Reporter } from '../type'
import type { MessageFormatter } from './utils'

import { defaultStdFormatter } from './utils'
export interface StdReporterOptions<T extends string> {
  /**
   * Log time format function
   */
  timeFormat?: (date: Date) => string
  /**
   * Custom function to format log message,
   * default to {@link defaultStdFormatter}
   */
  logMessage?: MessageFormatter<T>
}
/**
 * Creates a reporter function that outputs logs to the terminal.
 *
 * Embeded in `createNodeLogger()`
 *
 * @param timeFormat - A function that formats a Date object into a string timestamp,
 * default is `toLocaleString()`
 *
 * @example
 * ```ts
 * const reporter = createStdioReporter((date) => date.toISOString());
 * ```
 */

export function createStdioReporter<T extends string>(
  options: StdReporterOptions<T> = {},
): Reporter<T> {
  const {
    timeFormat = (date: Date) => date.toLocaleString(),
    logMessage = defaultStdFormatter,
  } = options
  return (date, msg, level, scope, e) => {
    const message = logMessage(date, msg, level as any, scope as T, e, timeFormat)
    process[((level === 'error' || level === 'warn') ? 'stderr' : 'stdout')].write(message + '\n')
  }
}
