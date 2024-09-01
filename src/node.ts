import { EOL } from 'node:os'
import { bgCyan, bgRed, blue, bold, cyan, dim, green, isColorSupported, magenta, red, yellow } from 'colorette'
import type { NormalizedError } from 'normal-error'
import { isError, toNormalizedError } from 'normal-error'
import type { Arrayable } from '@subframe7536/type-utils'
import type { Keys, LogLevel, LogMode, LogScope, LoggerOption } from './type'
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

const cwdRegexp = new RegExp(process.cwd().replace(/\\/g, '/'), 'i')

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
  ) {
    let _stack = e?.stack
    let _level = level.toUpperCase().padEnd(5)
    let _msg = parseMsg(msg)
    let _time = timeFormat(time)
    let _scope = scope?.padEnd(7) || 'default'
    const renderLog = () => [_time, _level, _scope, _msg + (e ? '\n' + _stack : '')].join(' | ')
    const plainLog = renderLog()
    let terminalLog = plainLog
    if (isColorSupported) {
      _level = colors[level](_level)
      _scope = scope ? colors.scope(_scope) : dim(_scope)
      _time = colors.time(_time)
      e && (_stack = parseStack(e.stack))
      terminalLog = renderLog()
    }
    return [plainLog, terminalLog]
  }
  function onNodeLog<T extends LogScope>(msg: any, level: LogLevel, scope?: Keys<T>, err?: unknown) {
    const time = new Date()
    const e = err ? toNormalizedError(err) : undefined
    const [plainLog, terminalLog] = getReadableLog(time, msg, level, scope, e)
    console[level === 'error' ? 'error' : 'log'](terminalLog)
    transports?.forEach(t => t({ plainLog, msg, time, level, scope, e }))
  }

  function onNodeTimer(label: string) {
    const start = Date.now()
    return () => {
      let time = new Date()
      let duration = `${(time.getTime() - start).toFixed(2)}ms`
      let _time = timeFormat(time)
      let plainLog = `${_time} | ${label}: ${duration}`
      console.log(
        isColorSupported
          ? `${colors.time(_time)} | ${bold(bgCyan(` ${label} `))} ${duration}`
          : plainLog,
      )
      transports?.forEach(t => t({ time, plainLog, level: 'timer', msg: duration, scope: label }))
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
  } catch (error) {
    return '' + msg
  }
}

export function parseStack(stack: string) {
  const _s = stack.split(/\r?\n/)
  const _stack = _s
    .slice(1)
    .map(l => l
      .replace('file://', '')
      .replace(/\\/g, '/')
      .replace(cwdRegexp, '.')
      .replace('node:internal/', 'node:')
      .replace(' at', () => blue('@'))
      .replace(/:(\d+):(\d+)/, green)
      .replace(/\((.*)\)/, (_, path) => `(${yellow(path)})`),
    )
  return [_s[0].replace(
    /(.*): (.*)/,
    (_, level, msg) => `${bold(bgRed(` ${level} `))} ${bold(msg)}`,
  )]
    .concat(_stack)
    .join(EOL)
}

/**
 * Create default node logger
 * @param option logger options, logMode default to `'info'`
 */
export function createNodeLogger<T extends LogScope = string>(option: NodeLoggerOption<T> = {}) {
  const { logMode = 'info', timeFormat, transports } = option
  const list = transports ? parseArray(transports) : undefined

  return createLogger<T>(logMode, ...createNodeLoggerConfig(list, timeFormat))
}
