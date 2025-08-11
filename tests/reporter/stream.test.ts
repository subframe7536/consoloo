import { Writable } from 'node:stream'

import { describe, expect, it, mock } from 'bun:test'
import { toNormalizedError } from 'normal-error'

import { createStreamReporter } from '../../src/reporter/stream'

class MockWritable extends Writable {
  _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    // silent
    callback()
  }
}

describe('Stream Reporter', () => {
  it('should log a simple message', () => {
    const stream = new MockWritable()
    const write = mock()
    stream.write = write
    const reporter = createStreamReporter({ stream })
    const date = new Date('2024-01-01T12:00:00.000Z')
    reporter(date, 'hello world', 'info', 'test')

    expect(write).toHaveBeenCalledTimes(0)

    // wait for flush
    setTimeout(() => {
      expect(write).toHaveBeenCalledTimes(1)
      expect(write.mock.calls[0][0]).toBe('2024-01-01T20:00:00.000 | INFO | test | hello world\n')
    }, 1000)
  })

  it('should handle error logging', () => {
    const stream = new MockWritable()
    const write = mock()
    stream.write = write
    const reporter = createStreamReporter({ stream })
    const date = new Date('2024-01-01T12:00:00.000Z')
    const error = new Error('test error')
    error.stack = 'stack trace'
    reporter(date, 'an error occurred', 'error', 'app', toNormalizedError(error))

    setTimeout(() => {
      expect(write).toHaveBeenCalledTimes(1)
      expect(write.mock.calls[0][0]).toContain('2024-01-01T20:00:00.000 | ERROR | app | an error occurred\ntest error\nstack trace\n')
    }, 1000)
  })

  it('should flush when queue reaches flushCount', () => {
    const stream = new MockWritable()
    const write = mock()
    stream.write = write
    const reporter = createStreamReporter({ stream, flushCount: 2, flushTimeout: 5000 })
    const date = new Date()

    reporter(date, 'message 1', 'info', 'test')
    expect(write).toHaveBeenCalledTimes(0)

    reporter(date, 'message 2', 'info', 'test')
    expect(write).toHaveBeenCalledTimes(1)
  })

  it('should use custom timeFormat', () => {
    const stream = new MockWritable()
    const write = mock()
    stream.write = write
    const reporter = createStreamReporter({
      stream,
      timeFormat: d => d.toISOString(),
    })
    const date = new Date('2024-01-01T12:00:00.000Z')
    reporter(date, 'hello', 'info', 'test')

    setTimeout(() => {
      expect(write).toHaveBeenCalledTimes(1)
      expect(write.mock.calls[0][0]).toBe('2024-01-01T12:00:00.000Z | INFO | test | hello\n')
    }, 1000)
  })
})
