import type { LogLevel, ReportFn } from '../type'

export type MessageFormatter<S extends string = string> = ReportFn<string, S>

import { blue, bold, cyan, dim, green, magenta, red, yellow } from 'ansis'
import { isError, toNormalizedError } from 'normal-error'

const colors = {
  info: green,
  debug: blue,
  warn: yellow,
  error: red,
  time: magenta,
}

const CWD_REGEXP = new RegExp(process.cwd().replace(/\\/g, '/'), 'i')
const LOCATION_REGEX = /:[^)]+/
const PAREN_REGEX = /\((.*)\)/
const BACK_SLASH_REGEX = /\\/g
const TAG_REGEX = /(.*): (.*)/
function parseStack(stack: string, level: LogLevel): string {
  const _s = stack.split(/\r?\n/)
  const _stack = _s
    .slice(1)
    .map(l => l
      .replace('file://', '')
      .replace(' at', blue`@`)
      .replace(BACK_SLASH_REGEX, '/')
      .replace(CWD_REGEXP, '.')
      .replace(LOCATION_REGEX, green)
      .replace(PAREN_REGEX, (_, path) => `(${yellow(path)})`),
    )
  return [_s[0].replace(
    TAG_REGEX,
    (_, name: string, msg: string) => `${colors[level].bold(name.toUpperCase())}: ${bold(msg)}`,
  )]
    .concat(_stack)
    .join('\n')
}

function parseMsg(msg: any): string {
  try {
    return typeof msg === 'string'
      ? msg
      : isError(msg)
        ? msg.message
        : JSON.stringify(msg)
  } catch {
    return '' + msg
  }
}

export function defaultStdFormatter<T extends string>(
  date: Date,
  msg: string,
  level: LogLevel | 'timer',
  scope?: T,
  e?: Error,
  timeFormat: (date: Date) => string = d => d.toLocaleString(),
): string {
  if (level === 'timer') {
    return `${colors.time(timeFormat(date))} | ${bold.bgCyan(` ${scope} `)} ${msg}`
  }
  let terminalLog = [
    magenta(date.toLocaleString()),
    colors[level as LogLevel](level.toUpperCase().padEnd(5)),
    (scope ? cyan(scope.padEnd(7)) : dim`default`),
    parseMsg(msg),
  ].join(' | ')

  if (e) {
    const _e = toNormalizedError(e)
    terminalLog += '\n' + parseStack(_e.stack, level)
  }
  return terminalLog
}

export function defaultMessageFormatter<T extends string>(
  date: Date,
  msg: string,
  level: LogLevel | 'timer',
  scope?: T,
  e?: Error,
  timeFormat: (date: Date) => string = d => d.toLocaleString(),
): string {
  const list = [timeFormat(date), level.toUpperCase()]
  if (scope) {
    list.push(scope)
  }
  list.push(msg)
  let logMessage = list.join(' | ')
  if (e) {
    logMessage += `\n${e.message}\n${e.stack}`
  }
  return logMessage
}
