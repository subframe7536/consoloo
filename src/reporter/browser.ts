import type { LogLevel, Reporter } from '../type'

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

function onBrowserLog(
  date: string,
  msg: any,
  level: LogLevel,
  scope?: string,
  e?: unknown,
): void {
  let _msg = `%c${date} %c${level.toUpperCase()}`
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

function onBrowserTimer(date: string, msg: string, label: string | undefined): void {
  console.log(
    `%c${date} %c${label}%c ${msg}`,
    'color:' + timeColor,
    renderBadge(scopeColors[0], scopeColors[1]),
    '',
  )
}

/**
 * Creates a reporter function that outputs logs to the browser console.
 *
 * Embeded in `createBrowserLogger()`
 *
 * @param timeFormat - A function that formats a Date object into a string timestamp,
 * default is `toLocaleString()`
 *
 * @example
 * ```ts
 * const reporter = createBrowserReporter((date) => date.toISOString());
 * ```
 */
export function createBrowserReporter<T extends string>(
  timeFormat: (date: Date) => string,
): Reporter<T> {
  return (date, msg, level, scope, e) => {
    const d = timeFormat(date)
    level === 'timer'
      ? onBrowserTimer(d, msg, scope)
      : onBrowserLog(d, msg, level, scope, e)
  }
}
