import type { Keys, Logger, LogLevel, LogMode, LogScope } from './type'
import type { LiteralOrString } from '@subframe7536/type-utils'

import { _LEVEL } from './utils'

export type { Logger, LogLevel, LogMode } from './type'

export * from 'normal-error'

export function defaultOnLog<T extends LogScope = string>(
  msg: any,
  level: LogLevel,
  scope?: Keys<T>,
  e?: unknown,
): void {
  console.log(
    `[${new Date().toISOString()}]`,
    `${level.toUpperCase()}${scope ? `(${scope})` : ''}:`,
    msg,
    e || '',
  )
}

export function defaultOnTimer<T extends LogScope = string>(label: LiteralOrString<Keys<T>>): VoidFunction {
  console.time(label)
  return () => {
    console.timeEnd(label)
  }
}

export function createLogger<T extends LogScope = string>(
  mode: LogMode,
  onLog: typeof defaultOnLog<T>,
  onTimer: typeof defaultOnTimer<T>,
): Logger<T> {
  let filter = (level: number, s?: string) =>
    // #hack: e is unknown when level = 'error', else e is scope
    (msg: any, e?: any, scope?: string) =>
      ((mode === _LEVEL[3] && level > 2)
        || (mode === _LEVEL[1] && level > 0)
        || (mode === _LEVEL[0]))
      && onLog(msg, _LEVEL[level], ...(level > 2 ? [s || scope, e] : [s || e]))
  let withScope = (scope?: string): any => ({
    debug: filter(0, scope),
    info: filter(1, scope),
    warn: filter(2, scope),
    error: filter(3, scope),
    timer: onTimer,
    setLogMode: (m: LogMode) => mode = m,
  })
  return {
    ...withScope(),
    withScope,
  }
}

export function createBaseLogger<T extends LogScope = string>(logMode: LogMode = 'info'): Logger<T> {
  return createLogger(logMode, defaultOnLog<T>, defaultOnTimer<T>)
}
