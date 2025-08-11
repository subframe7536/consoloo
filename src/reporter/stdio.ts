import type { LogLevel, Reporter } from '../type'

import { blue, bold, cyan, dim, green, magenta, red, yellow } from 'ansis'
import { isError } from 'normal-error'

import { toNormalizedError } from '../core'

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
  timeFormat: (date: Date) => string,
): Reporter<T> {
  return (date, msg, level, scope, e) => {
    if (level === 'timer') {
      process.stdout.write(`${colors.time(timeFormat(date))} | ${bold.bgCyan(` ${scope} `)} ${msg}`)
      return
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

    process[((level === 'error' || level === 'warn') ? 'stderr' : 'stdout')].write(terminalLog + '\n')
  }
}
