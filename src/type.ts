import type { LiteralOrString, Prettify } from '@subframe7536/type-utils'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogMode = 'disable' | 'info' | 'debug' | 'error'

export type LogScope = string | Record<string, string>

export type Keys<S extends LogScope> = S extends Record<string, string>
  ? S[keyof S]
  : S extends string
    ? S
    : never

type LogFn<Level extends LogLevel, S extends LogScope, WithScope extends boolean> =
  Level extends 'error'
    ? (msg: any, e?: unknown, ...args: WithScope extends true ? [scope?: Keys<S>] : []) => void
    : (msg: any, ...args: WithScope extends true ? [scope?: Keys<S>] : []) => void

type LogUtilFn<S extends LogScope> = {
  /**
   * set logger log mode
   * @param mode {@link LogMode}
   */
  setLogMode: (mode: LogMode) => void
  timer: (label: LiteralOrString<Keys<S>>) => () => void
}

type LogBaseFn<S extends LogScope, WithScope extends boolean = true> = {
  [K in LogLevel]: LogFn<K, S, WithScope>
}

export type Logger<S extends LogScope> = Prettify<LogBaseFn<S> & LogUtilFn<S> & {
  /**
   * create scope logger
   * @param scope log scope
   */
  withScope: (scope: Keys<S>) => Prettify<LogBaseFn<S, false> & LogUtilFn<S>>
}>
