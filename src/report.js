import { omit } from './utils.js'

/**
 * @typedef {import('./report').METRICS_ALIASES} METRICS_ALIASES
 * @type METRICS_ALIASES
 */
export const SDC_CHECK_METRICS_ALIASES = {
  lockFileIsNotSafe: 'lockfile-is-not-safe',
  hasTooManyDecisionMakers: 'too-many-decision-makers',
  isPackageUnmaintained: 'unmaintained-package',
  hasInstallScripts: 'install-scripts',
  noSourceCodeRepository: 'no-source-code',
  scriptsHaveDangerousShellCommands: 'dangerous-shell-commands',
  packageReleasedAfterLongPeriodOfInactivity: 'released-after-long-period-of-inactivity',
  packageVersionIsTooNew: 'package-is-too-new',
  hasOsScripts: 'has-os-scripts',
  hasObfuscatedCode: 'obfuscated-code'
}

/**
 * @typedef {import('./report').createReport} createReport
 * @type createReport
 */
export function createReport(options) {
  if (
    !options ||
    !Array.isArray(options.findings) ||
    options.findings.length === 0 ||
    !options.lockFileIsNotSafe
  ) {
    throw new Error('There are no metrics data to create report')
  }

  let { findings, lockFileIsNotSafe, config, ignoredPackages } = options
  let keys = getReportMetricKeys(SDC_CHECK_METRICS_ALIASES)
  let report = initReport()

  // Add report data for 'lockfile-is-not-safe' metric:
  if (lockFileIsNotSafe.type === 'error') {
    let level = getReportLevel(config, SDC_CHECK_METRICS_ALIASES.lockFileIsNotSafe)
    lockFileIsNotSafe.errors.forEach(error => {
      report[level].push({
        metric: SDC_CHECK_METRICS_ALIASES.lockFileIsNotSafe,
        message: error.message,
        package: error.package
      })
    })
  }

  // Add report data for other metrics:
  for (let { package: _package, version, metrics } of findings) {
    let packageSpec = `${_package}@${version}`
    if (ignoredPackages[packageSpec] === true || ignoredPackages[_package] === true) {
      continue
    }

    keys.forEach(key => {
      let metric = SDC_CHECK_METRICS_ALIASES[key]
      if (metrics[key].result === true && !isIgnoredMetric(metric, packageSpec, ignoredPackages)) {
        let level = getReportLevel(config, metric)
        report[level].push({
          metric,
          package: packageSpec,
          message: getMetricMessageForReport(metric, metrics[key].value)
        })
      }
    })
  }

  return { ...report, type: report.errors.length > 0 ? 'error' : 'success' }
}

/**
 * @typedef {import('./report').initReport} initReport
 * @type initReport
 */
function initReport() {
  return { type: 'none', errors: [], warnings: [] }
}

/**
 * @typedef {import('./report').getReportLevel} getReportLevel
 * @type getReportLevel
 */
function getReportLevel(config, key) {
  return config.errors.includes(key) ? 'errors' : 'warnings'
}

/**
 * @typedef {import('./report').getReportMetricKeys} getReportMetricKeys
 * @type getReportMetricKeys
 */
function getReportMetricKeys(aliases) {
  // @ts-expect-error Type inference a bit poor here
  return Object.keys(omit(['lockFileIsNotSafe'], aliases))
}

/**
 * @typedef {import('./report').getMetricMessageForReport} getMetricMessageForReport
 * @type getMetricMessageForReport
 */
export function getMetricMessageForReport(metric, value) {
  switch (metric) {
    case 'unmaintained-package':
      return `package last update date is ${value}`
    case 'package-is-too-new':
      return `package release date is ${value}`
    case 'too-many-decision-makers':
      return `count of decision makers is ${value}`
    case 'no-source-code':
      return `could not find references to source code repository`
    case 'install-scripts':
      return `install scripts found: ${value}`
    case 'obfuscated-code':
      return `obfuscated code found: ${value}`
    case 'dangerous-shell-commands':
      return `shell commands found: ${value}`
    case 'released-after-long-period-of-inactivity':
      return `previous package release date is ${value}`
    case 'has-os-scripts': {
      let content = Array.isArray(value) ? value.join(', ') : 'n/a'
      return `os scripts found: [${content}]`
    }
    default:
      break
  }
  return 'n/a'
}

/**
 * @typedef {import('./report').isIgnoredMetric} isIgnoredMetric
 * @type isIgnoredMetric
 */
export function isIgnoredMetric(metric, spec, ignoredPackages) {
  let [name] = spec.split('@')

  if (ignoredPackages[spec] === true || ignoredPackages[name] === true) {
    return true
  }

  let ignoredMetrics = [
    // @ts-expect-error Type inference a bit poor here
    ...(Array.isArray(ignoredPackages[spec]) ? ignoredPackages[spec] : []),
    ...(Array.isArray(ignoredPackages[name]) ? ignoredPackages[name] : [])
  ]
  return !!ignoredMetrics.includes(metric)
}
