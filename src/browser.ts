import type { Keys, Logger, LoggerOption, LogLevel, LogScope } from './type'

import { createLogger } from './core'

type BrowserLoggerOptions = LoggerOption

const scopeColors = ['#3f6894', '#feecd8'] as const
const timeColor = '#918abc'

const levelColors = {
  debug: '#66a2cc',
  info: '#7cbd75',
  warn: '#dbaf57',
  error: '#e08585',
} as const

const r = '.3rem'

function renderBadge(bg: string, fg: string, radius = r): string {
  return `font-size:.8rem;padding:.1rem .3rem;border-radius:${radius};background-color:${bg};color:${fg}`
}
export function createBrowserLoggerConfig(
  timeFormat: (date: Date) => string = date => date.toLocaleString(),
): [any, any] {
  function onBrowserLog<T extends LogScope = string>(
    msg: any,
    level: LogLevel,
    scope?: Keys<T>,
    e?: unknown,
  ): void {
    let _msg = `%c${timeFormat(new Date())} %c${level.toUpperCase()}`
    const args = ['color:' + timeColor]
    if (scope) {
      _msg += `%c${scope}`
      args.push(
        renderBadge(levelColors[level], '#fff', `${r} 0 0 ${r}`),
        renderBadge(scopeColors[0], scopeColors[1], `0 ${r} ${r} 0`),
      )
    } else {
      args.push(renderBadge(levelColors[level], '#fff'))
    }
    _msg += '%c '
    args.push('')
    if (typeof msg !== 'object') {
      _msg += msg
    } else {
      _msg += '%o'
      args.push(msg)
    }
    console.log(_msg, ...args)
    e && console.error(e)
  }

  function onBrowserTimer(label: string): VoidFunction {
    const start = Date.now()
    return () => console.log(
      `%c${timeFormat(new Date())} %c${label}%c ${(Date.now() - start).toFixed(2)}ms`,
      'color:' + timeColor,
      renderBadge(scopeColors[0], scopeColors[1]),
      '',
    )
  }
  return [onBrowserLog, onBrowserTimer]
}

/**
 * Create default browser logger
 * @param options logger options, logMode default to `'info'`
 */
export function createBrowserLogger<T extends LogScope = string>(
  options: BrowserLoggerOptions = {},
): Logger<T> {
  const { logMode = 'info', timeFormat } = options
  return createLogger<T>(logMode, ...createBrowserLoggerConfig(timeFormat))
}
