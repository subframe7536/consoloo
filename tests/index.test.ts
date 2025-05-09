import { rmSync } from 'node:fs'
import { dirname } from 'node:path'

import { createBaseLogger } from '../src/core'
import { createNodeLogger } from '../src/node'
import { createFileReporter } from '../src/reporter/file'

const cleanTempFile = process.argv.includes('clean')

const logger = createBaseLogger()

const da = {
  a: {
    b: {
      c: 1,
    },
  },
}

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
node.info(da, 'data')
const scopeLogger = node.withScope('foo')
scopeLogger.warn('test change scope')

const logDir = 'tests/log'
const fileLogger = createNodeLogger<'file' | 'test'>({
  logMode: 'debug',
  reporter: [createFileReporter({ logDir })],
})
fileLogger.debug('info', 'file')
// for (let i = 0; i < 1e4; i++) {
//   fileLogger.debug(Array.from({ length: 20 }, () => '测试'))
// }
try {
  throw new Error('test error in file')
} catch (error) {
  fileLogger.error('test error in file', error)
}

node.setLogMode('disable')
node.error(new Error('err'))
stop()
console.log()
if (cleanTempFile) {
  setTimeout(() => {
    rmSync(logDir, { recursive: true })
  }, 500)
}
