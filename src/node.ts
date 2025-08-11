import type { Logger, LoggerOption, Reporter } from './type'

import { createLogger } from './core'
import { createStdioReporter } from './reporter/stdio'

export interface NodeLoggerOption extends LoggerOption {
  /**
   * Whether log to console
   */
  std?: boolean
  reporter?: Reporter[]
}

/**
 * Create default node logger
 * @param option logger options, logMode default to `'info'`
 */
export function createNodeLogger<T extends string>(
  option: NodeLoggerOption = {},
): Logger<T> {
  const {
    logMode = 'info',
    timeFormat = date => date.toLocaleString(),
    reporter = [],
    std,
  } = option
  if (std) {
    reporter.push(createStdioReporter(timeFormat))
  }
  return createLogger<T>(logMode, reporter)
}
