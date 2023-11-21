import { cwd, from } from '@nodesecure/scanner'

import { gatherLockFileSafetyMetric, getMetrics } from './src/metrics.js'
import { createReport } from './src/report.js'
import { findLockFilePath, loadConfig, loadIgnoreFile, resolveMode } from './src/utils.js'

/**
 * @typedef {import('./index').check} check
 * @type check
 */
export async function check({
  config,
  ignoredPackages,
  packageName = '',
  rootDir = '',
  version = ''
}) {
  try {
    if (!rootDir && !packageName) {
      throw new Error('You have not specified rootDir or packageName')
    }

    let mode = resolveMode(rootDir)
    let lockfilePath = await findLockFilePath(mode, rootDir)

    config = config || (await loadConfig(mode, rootDir))
    ignoredPackages = ignoredPackages || (await loadIgnoreFile(rootDir))

    let nssOutput =
      mode === 'internal'
        ? await cwd(rootDir, {
            forceRootAnalysis: true,
            vulnerabilityStrategy: 'npm'
          })
        : await from(version ? `${packageName}@${version}` : packageName, {
            forceRootAnalysis: true,
            vulnerabilityStrategy: 'npm'
          })

    return createReport({
      config,
      findings: await getMetrics(nssOutput, config, rootDir),
      ignoredPackages,
      lockFileIsNotSafe: await gatherLockFileSafetyMetric(lockfilePath)
    })
  } catch (error) {
    /* eslint-disable no-console */
    console.error(error)
    console.error('ERROR: Could not perform sdc-check audit')
    /* eslint-enable no-console */
    return { errors: [], type: 'none', warnings: [] }
  }
}
