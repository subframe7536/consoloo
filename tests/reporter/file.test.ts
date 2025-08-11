import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { toNormalizedError } from 'normal-error'

import { createFileReporter } from '../../src/reporter/file'

const LOG_DIR = './test-logs'

describe('File Reporter', () => {
  beforeEach(() => {
    // Clean up and create log directory before each test
    if (existsSync(LOG_DIR)) {
      rmSync(LOG_DIR, { recursive: true, force: true })
    }
    mkdirSync(LOG_DIR, { recursive: true })
  })

  afterEach(() => {
    // Clean up log directory after each test
    if (existsSync(LOG_DIR)) {
      rmSync(LOG_DIR, { recursive: true, force: true })
    }
  })

  it('should log a simple message and match snapshot', () => {
    const reporter = createFileReporter({
      logDir: LOG_DIR,
      timeFormat: () => 'mock-date',
    })
    const date = new Date()
    reporter(date, 'hello world', 'info', 'test')

    // Since file operations are synchronous, we can read the file immediately
    const logFilePath = join(LOG_DIR, 'app.log')
    expect(existsSync(logFilePath)).toBe(true)
    const logContent = readFileSync(logFilePath, 'utf-8')
    expect(logContent).toMatchSnapshot()
  })

  it('should handle error logging and match snapshot', () => {
    const reporter = createFileReporter({
      logDir: LOG_DIR,
      timeFormat: () => 'mock-date',
    })
    const date = new Date()
    const error = new Error('test error')
    error.stack = 'mock stack trace'
    reporter(date, 'an error occurred', 'error', 'app', toNormalizedError(error))

    const logFilePath = join(LOG_DIR, 'app.log')
    expect(existsSync(logFilePath)).toBe(true)
    const logContent = readFileSync(logFilePath, 'utf-8')
    expect(logContent).toMatchSnapshot()
  })

  it('should use custom getLogFileName and match snapshot', () => {
    const reporter = createFileReporter({
      logDir: LOG_DIR,
      timeFormat: () => 'mock-date',
      getLogFileName: (level, scope) => `${scope}-${level}`,
    })
    const date = new Date()
    reporter(date, 'custom file name', 'warn', 'custom-scope')

    const logFilePath = join(LOG_DIR, 'custom-scope-warn.log')
    expect(existsSync(logFilePath)).toBe(true)
    const logContent = readFileSync(logFilePath, 'utf-8')
    expect(logContent).toMatchSnapshot()
  })

  it('should rotate log file when size exceeds maxSize', () => {
    const reporter = createFileReporter({
      logDir: LOG_DIR,
      maxSize: 0.00001, // ~10 bytes, very small to force rotation
      timeFormat: () => 'mock-date',
    })
    const date = new Date()

    // First log, creates app.log
    reporter(date, 'message 1', 'info', 'test')
    const logFilePath = join(LOG_DIR, 'app.log')
    const backupPath1 = join(LOG_DIR, 'app.1.log')
    expect(existsSync(logFilePath)).toBe(true)
    expect(existsSync(backupPath1)).toBe(false)
    const content1 = readFileSync(logFilePath, 'utf-8')
    expect(content1).toContain('message 1')

    // Second log, should trigger rotation
    reporter(date, 'message 2', 'info', 'test')
    expect(existsSync(logFilePath)).toBe(true) // new app.log
    expect(existsSync(backupPath1)).toBe(true) // old app.log becomes app.1.log

    const content2 = readFileSync(logFilePath, 'utf-8')
    const backupContent1 = readFileSync(backupPath1, 'utf-8')

    expect(content2).toContain('message 2')
    expect(backupContent1).toContain('message 1')

    expect(content2).toMatchSnapshot('new_log_after_rotation')
    expect(backupContent1).toMatchSnapshot('rotated_log_content')
  })

  it('should handle multiple backups', () => {
    const reporter = createFileReporter({
      logDir: LOG_DIR,
      maxSize: 0.00001, // ~10 bytes
      maxBackups: 2,
      timeFormat: () => 'mock-date',
      getLogFileName: () => 'test-backup',
    })
    const date = new Date()

    reporter(date, 'message 1', 'info', 'main')
    reporter(date, 'message 2', 'info', 'main')
    reporter(date, 'message 3', 'info', 'main')
    reporter(date, 'message 4', 'info', 'main')

    const logPath = (i?: number): string => join(LOG_DIR, `test-backup${i ? `.${i}` : ''}.log`)

    expect(readFileSync(logPath(), 'utf-8')).toContain('message 4')
    expect(readFileSync(logPath(1), 'utf-8')).toContain('message 3')
    expect(readFileSync(logPath(2), 'utf-8')).toContain('message 2')
    expect(existsSync(logPath(3))).toBe(false)
  })
})
