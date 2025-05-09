/* eslint-disable one-var */
import type { Logger, LogMode, Reporter } from './type'

import { _LEVEL } from './type'

export * from './type'
export * from 'normal-error'

export function createLogger<T extends string>(
  mode: LogMode,
  report: Reporter<T>[],
): Logger<T> {
  let rep = (...args: any): void => report.forEach(r => r(...args as [any, any, any, any])),
    filter = (level: number, s?: string) =>
    // [HACK]: e is unknown when level = 'error', else e is scope
      (msg: any, e?: any, scope?: string) =>
        ((mode === _LEVEL[3] && level > 2)
          || (mode === _LEVEL[1] && level > 0)
          || (mode === _LEVEL[0]))
        && rep(new Date(), msg, _LEVEL[level], ...(level > 2 ? [s || scope, e] : [s || e])),
    withScope = (scope?: string): any => ({
      debug: filter(0, scope),
      info: filter(1, scope),
      warn: filter(2, scope),
      error: filter(3, scope),
      timer: (label: any) => {
        let start = Date.now(), d: Date
        return () => (
          d = new Date(), rep(d, `${(d.getTime() - start).toFixed(2)}ms`, 'timer', label)
        )
      },
      setLogMode: (m: LogMode) => mode = m,
    })
  return {
    ...withScope(),
    withScope,
  } satisfies Logger<T>
}

export function createBaseLogger<T extends string>(logMode: LogMode = 'info'): Logger<T> {
  return createLogger(
    logMode,
    [
      (date, level, msg, scope, e) => console.log(
        `[${date.toISOString()}]`,
        `${level.toUpperCase()}${scope ? `(${scope})` : ''}:`,
        msg,
        e || '',
      ),
    ],
  )
}
