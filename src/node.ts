import type { Keys, Logger, LoggerOption, LogLevel, LogScope } from './type'
import type { Arrayable } from '@subframe7536/type-utils'
import type { NormalizedError } from 'normal-error'

import { EOL } from 'node:os'

import ansis, { blue, bold, cyan, dim, green, magenta, red, yellow } from 'ansis'
import { isError, toNormalizedError } from 'normal-error'

import { createLogger } from './core'
import { parseArray } from './utils'

const colors = {
  info: green,
  debug: blue,
  warn: yellow,
  error: red,
  scope: cyan,
  time: magenta,
}

export type TransportLevel = LogLevel | 'timer'

export type TransportFn<T extends LogScope = string> = (data: {
  plainLog: string
  time: Date
  msg: any
  level: TransportLevel
  scope?: Keys<T>
  e?: NormalizedError
}) => void
export type NodeLoggerOption<T extends LogScope = string> = LoggerOption & {
  /**
   * log transports
   *
   * built-in: {@link createFileTransport}
   */
  transports?: Arrayable<TransportFn<T>>
}

export function createNodeLoggerConfig(
  transports?: TransportFn<any>[],
  timeFormat: (date: Date) => string = date => date.toLocaleString(),
): [any, any] {
  function getReadableLog(
    time: Date,
    msg: any,
    level: LogLevel,
    scope?: string,
    e?: NormalizedError,
  ): string {
    const _stack = e ? parseStack(e.stack) : e
    const _level = colors[level](level.toUpperCase().padEnd(5))
    const _msg = parseMsg(msg)
    const _time = colors.time(timeFormat(time))
    const _scope = scope ? colors.scope(scope.padEnd(7)) : dim`default`
    return [_time, _level, _scope, _msg + (e ? '\n' + _stack : '')].join(' | ')
  }
  function onNodeLog<T extends LogScope>(msg: any, level: LogLevel, scope?: Keys<T>, err?: unknown): void {
    const time = new Date()
    const e = err ? toNormalizedError(err) : undefined
    const terminalLog = getReadableLog(time, msg, level, scope, e)
    console[level === 'error' ? 'error' : 'log'](terminalLog)
    transports?.forEach(t => t({
      plainLog: ansis.strip(terminalLog),
      msg,
      time,
      level,
      scope,
      e,
    }))
  }

  function onNodeTimer(label: string) {
    const start = Date.now()
    return () => {
      const time = new Date()
      const duration = `${(time.getTime() - start).toFixed(2)}ms`
      const _time = timeFormat(time)
      const logString = `${colors.time(_time)} | ${bold.bgCyan(` ${label} `)} ${duration}`
      console.log(logString)
      transports?.forEach(t => t({
        time,
        plainLog: ansis.strip(logString),
        level: 'timer',
        msg: duration,
        scope: label,
      }))
    }
  }

  return [onNodeLog, onNodeTimer]
}

export function parseMsg(msg: any): string {
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

const CWD_REGEXP = new RegExp(process.cwd().replace(/\\/g, '/'), 'i')
const LOCATION_REGEX = /:[^)]+/
const PAREN_REGEX = /\((.*)\)/
const BACK_SLASH_REGEX = /\\/g
export function parseStack(stack: string): string {
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
    /(.*): (.*)/,
    (_, level, msg) => `${bold.bgRed` ${level} `} ${bold(msg)}`,
  )]
    .concat(_stack)
    .join(EOL)
}

/**
 * Create default node logger
 * @param option logger options, logMode default to `'info'`
 */
export function createNodeLogger<T extends LogScope = string>(option: NodeLoggerOption<T> = {}): Logger<T> {
  const { logMode = 'info', timeFormat, transports } = option
  const list = transports ? parseArray(transports) : undefined

  return createLogger<T>(logMode, ...createNodeLoggerConfig(list, timeFormat))
}
