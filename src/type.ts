import type { LiteralOrString, Prettify } from '@subframe7536/type-utils'
import type { NormalizedError } from 'normal-error'

export const _LEVEL = ['debug', 'info', 'warn', 'error'] as const
export type LogLevel = typeof _LEVEL[number]

export type LogMode = 'disable' | 'info' | 'debug' | 'error'

type LogFn<Level extends LogLevel, S extends string, WithScope extends boolean> =
  Level extends 'error'
    ? (msg: string | object, e?: unknown, ...args: WithScope extends true ? [scope?: S] : []) => void
    : (msg: string | object, ...args: WithScope extends true ? [scope?: S] : []) => void

interface LogUtilFn<S extends string> {
  /**
   * Set logger log mode
   * @param mode {@link LogMode}
   */
  setLogMode: (mode: LogMode) => void
  timer: (label: LiteralOrString<S>) => VoidFunction
}

type LogBaseFn<S extends string, WithScope extends boolean = true> = {
  [K in LogLevel]: LogFn<K, S, WithScope>
}

export type Reporter<S extends string = string> = {
  (date: Date, msg: any, level: LogLevel, scope?: S, e?: NormalizedError): void
  (date: Date, msg: any, level: 'timer', scope: string, e?: never): void
}

export type Logger<S extends string> = Prettify<LogBaseFn<S> & LogUtilFn<S> & {
  /**
   * Create scope logger
   * @param scope log scope
   */
  withScope: (scope: S) => Prettify<LogBaseFn<S, false> & LogUtilFn<S>>
}>

export interface LoggerOption {
  /**
   * Log mode
   * @default 'normal'
   */
  logMode?: LogMode
  /**
   * Log time format function
   */
  timeFormat?: (date: Date) => string
}
