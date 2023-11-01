import { EOL } from 'node:os'
import pico from 'picocolors'
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
  time: pico.gray,
}

export type TransportLevel = LogLevel | 'timer'

export type TransportFn<T extends LogScope = string> = (info: {
  plainLog: string
  time: Date
  msg: any
  level: TransportLevel
  scope?: Keys<T>
  e?: unknown
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
  timeFormat: (date: Date) => string = date => date.toLocaleString(),
): [any, any] {
  function onNodeLog<T extends LogScope>(msg: any, level: LogLevel, scope?: Keys<T>, e?: unknown) {
    const time = new Date()
    const { plainLog, terminalLog } = getReadableLog(time, msg, level, scope, e)
    console[level === 'error' ? 'error' : 'log'](terminalLog)
    transports?.forEach(t => t({ plainLog, msg, time, level, scope, e }))
  }

  function onNodeTimer(label: string) {
    const start = Date.now()
    return () => {
      const duration = (Date.now() - start).toFixed(2)
      const time = new Date()
      const plainLog = `[${timeFormat(time)}] ${label}: ${duration}ms`
      if (pico.isColorSupported) {
        const _label = pico.bold(pico.bgCyan(` ${label} `))
        const _time = colors.time(`[${timeFormat(time)}]`)
        console.log(`${_time} ${_label} ${duration}ms`)
      } else {
        console.log(plainLog)
      }
      transports?.forEach(t => t({
        plainLog,
        time,
        level: 'timer',
        msg: `${duration}ms`,
        scope: label as any,
      }))
    }
  }
  function getReadableLog(
    time: Date,
    msg: any,
    level: LogLevel,
    scope?: string,
    e?: unknown,
  ) {
    let _level = level.toUpperCase()
    let _msg = parseMsg(msg)
    let _e = e ? toNormalizedError(e) : null
    let _stack = _e ? `\n${_e.stack}` : ''
    let _time = `[${timeFormat(time)}]`
    const plainLog = `${_time} [${_level}] [${scope || 'default'}] ${_msg}${_stack}`
    let terminalLog = plainLog
    if (pico.isColorSupported) {
      _level = colors[level](_level)
      const _scope = scope ? `(${colors.scope(scope)})` : ''
      _time = colors.time(_time)
      _stack = _e ? `\n${parseStack(_e.stack)}` : ''
      terminalLog = `${_time} ${_level}${_scope}> ${_msg}${_stack}`
    }
    return {
      plainLog,
      terminalLog,
    }
  }
  return [onNodeLog, onNodeTimer]
}

export function parseMsg(msg: any) {
  let _msg = ''
  try {
    switch (typeof msg) {
      case 'string':
        _msg = msg
        break
      case 'undefined':
        _msg = ''
        break
      case 'object':
        _msg = isError(msg)
          ? msg.message
          : JSON.stringify(msg, null, 2)
        break
      case 'symbol':
        _msg = msg.toString()
        break
      case 'number':
      case 'bigint':
      case 'boolean':
      case 'function':
        _msg = msg.toString()
        break
    }
  } catch (error) {
    msg = `${msg}`
  }
  return _msg
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
    (_, level, msg) => `${pico.bold(pico.bgRed(` ${level} `))} ${pico.underline(msg)}`,
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
