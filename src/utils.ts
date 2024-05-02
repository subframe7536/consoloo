import type { Arrayable } from '@subframe7536/type-utils'

export const _LEVEL = ['debug', 'info', 'warn', 'error'] as const

export function parseArray<T>(arr: Arrayable<T>): T[] {
  return Array.isArray(arr) ? arr : [arr]
}
