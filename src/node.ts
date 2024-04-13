import { EOL } from 'node:os'
import pico from 'picocolors'
import type { NormalizedError } from 'normal-error'
import { isError, toNormalizedError } from 'normal-error'
import type { Arrayable } from '@subframe7536/type-utils'
import type { Keys, LogLevel, LogMode, LogScope } from './type'
import { createLogger } from './core'

const colors = {
  info: pico.green,
  debug: pico.blue,
  warn: pico.yellow,
  error: pico.red,
  scope: pico.cyan,
  time: pico.magenta,
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
export type NodeLoggerOption<T extends LogScope = string> = {
  /**
   * log mode
   * @default 'normal'
   */
  logMode?: LogMode
  /**
   * log transports
   *
   * built-in: {@link createFileTransport}
   */
  transports?: Arrayable<TransportFn<T>>
  timeFormat?: (date: Date) => string
}

const cwdRegexp = new RegExp(process.cwd().replace(/\\/g, '/'), 'i')

export function createNodeLoggerConfig(
  transports?: TransportFn<any>[],
  timeFormat: (date: Date) => string = date => date.toLocaleTimeString(),
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
    const renderLog = () => [_time, _level, _scope, `${_msg}${e ? `\n${_stack}` : ''}`].join(' | ')
    const plainLog = renderLog()
    let terminalLog = plainLog
    if (pico.isColorSupported) {
      _level = colors[level](_level)
      _scope = scope ? colors.scope(_scope) : pico.dim(_scope)
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
        pico.isColorSupported
          ? `${colors.time(_time)} | ${pico.bold(pico.bgCyan(` ${label} `))} ${duration}`
          : plainLog,
      )
      transports?.forEach(t => t({ time, plainLog, level: 'timer', msg: duration, scope: label }))
    }
  }

  return [onNodeLog, onNodeTimer]
}

export function parseMsg(msg: any) {
  try {
    switch (typeof msg) {
      case 'string':
        return msg
      case 'undefined':
        return ''
      case 'object':
        return isError(msg)
          ? msg.message
          : JSON.stringify(msg, null, 2)
      case 'symbol':
      case 'number':
      case 'bigint':
      case 'boolean':
      case 'function':
        return msg.toString()
    }
  } catch (error) {
    return `${msg}`
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
      .replace(' at', () => pico.blue('@'))
      .replace(/:(\d+):(\d+)/, pico.green)
      .replace(/\((.*)\)/, (_, path) => `(${pico.yellow(path)})`),
    )
  return [_s[0].replace(
    /(.*): (.*)/,
    (_, level, msg) => `${pico.bold(pico.bgRed(` ${level} `))} ${pico.bold(msg)}`,
  )]
    .concat(_stack)
    .join(EOL)
}

/**
 * create default node logger
 * @param option logger options, logMode default to `'normal'`
 */
export function createNodeLogger<T extends LogScope = string>(option: NodeLoggerOption<T> = {}) {
  const { logMode = 'info', timeFormat, transports: transport } = option
  const transports = transport
    ? Array.isArray(transport)
      ? transport
      : [transport]
    : undefined

  return createLogger<T>(logMode, ...createNodeLoggerConfig(transports, timeFormat))
}
