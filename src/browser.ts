import type { Keys, LogLevel, LogMode, LogScope } from './type'
import { createLogger } from './core'

const scopeColors = ['#3f6894', '#feecd8'] as const

const levelColors = {
  debug: '#66a2cc',
  info: '#7cbd75',
  warn: '#dbaf57',
  error: '#e08585',
} as const

const r = '.3rem'

function renderBadge(bg: string, fg: string, radius = r) {
  return `font-size:.8rem;padding:.1rem .3rem;border-radius:${radius};background-color:${bg};color:${fg}`
}

export function onBrowserLog<T extends LogScope = string>(msg: any, level: LogLevel, scope?: Keys<T>, e?: unknown) {
  let _msg = `%c${level.toUpperCase()}`
  const args = []
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

export function onBrowserTimer(label: string) {
  const start = Date.now()
  return () => console.log(
    `%c${label}%c ${(Date.now() - start).toFixed(2)}ms`,
    renderBadge(scopeColors[0], scopeColors[1]),
    '',
  )
}

/**
 * create default browser logger
 * @param logMode log mode, default to 'normal'
 */
export function createBrowserLogger<T extends LogScope = string>(logMode: LogMode = 'info') {
  return createLogger<T>(logMode, onBrowserLog, onBrowserTimer)
}
