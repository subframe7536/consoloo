import { createBrowserLogger } from '../src/browser'
import { createBaseLogger } from '../src/core'

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
const node = createBrowserLogger()
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

const fileLogger = createBrowserLogger<'file' | 'test'>({ logMode: 'debug' })
fileLogger.debug('info', 'file')
try {
  throw new Error('test error in file')
} catch (error) {
  fileLogger.error('test error in file', error)
}
node.setLogMode('disable')
node.error(new Error('err'))
stop()
