import type { Logger, LoggerOption } from './type'

import { createLogger } from './core'
import { createBrowserReporter } from './reporter/browser'

/**
 * Create default browser logger
 * @param options Logger options, logMode default to `'info'`
 */
export function createBrowserLogger<T extends string>(
  options: LoggerOption = {},
): Logger<T> {
  const { logMode = 'info', timeFormat = date => date.toLocaleString() } = options
  return createLogger<T>(
    logMode,
    [createBrowserReporter<T>(timeFormat)],
  )
}
