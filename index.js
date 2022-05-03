import { from, cwd } from '@nodesecure/scanner'

import { getMetrics, gatherLockFileSafetyMetric } from './src/metrics.js'
import { loadConfig, loadIgnoreFile, findLockFilePath, resolveMode } from './src/utils.js'
import { createReport } from './src/report.js'

/**
 * @typedef {import('./index').check} check
 * @type check
 */
export async function check({
  rootDir = '',
  packageName = '',
  version = '',
  config,
  ignoredPackages
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
            vulnerabilityStrategy: 'npm',
            forceRootAnalysis: true
          })
        : await from(version ? `${packageName}@${version}` : packageName, {
            vulnerabilityStrategy: 'npm',
            forceRootAnalysis: true
          })

    return createReport({
      findings: await getMetrics(nssOutput, config, rootDir),
      lockFileIsNotSafe: await gatherLockFileSafetyMetric(lockfilePath),
      ignoredPackages,
      config
    })
  } catch (error) {
    /* eslint-disable no-console */
    console.error(error)
    console.error('ERROR: Could not perform sdc-check audit')
    /* eslint-enable no-console */
    return { type: 'none', errors: [], warnings: [] }
  }
}
