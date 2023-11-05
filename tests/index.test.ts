import { rmSync } from 'node:fs'
import { dirname } from 'node:path'
import { createBaseLogger } from '../src/core'
import { createNodeLogger } from '../src/node'
import { createFileTransport } from '../src/transport'

const cleanTempFile = process.argv.includes('clean')

const logger = createBaseLogger()

logger.info('info')
logger.warn('warn')
logger.error('error')
logger.setLogMode('debug')
logger.debug('debug')
logger.withScope('scope').debug('scope debug')
logger.info('info after scope')
console.log()
const node = createNodeLogger()
const stop = node.timer('log timer')
node.info('info')
node.warn('warn')
node.error('error')
node.setLogMode('debug')
node.withScope('with').debug('test withScope')
node.info('test inline scope', 'inline')
const scopeLogger = node.withScope('foo')
scopeLogger.warn('test change scope')

const logPath = 'tests/log/test.log'
const fileLogger = createNodeLogger<'file' | 'test'>({
  logMode: 'debug',
  transports: createFileTransport({ file: logPath }),
})
fileLogger.debug('info', 'file')
try {
  throw new Error('test error in file')
} catch (error) {
  fileLogger.error('test error in file', error)
}
stop()
console.log()
if (cleanTempFile) {
  rmSync(dirname(logPath), { recursive: true })
}
