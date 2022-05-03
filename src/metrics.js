import pacote from 'pacote'
import { extname, join } from 'path'
import { readFile } from 'fs/promises'
import { ValidateHost, ParseLockfile } from 'lockfile-lint-api'

import { omit, pick } from './utils.js'

const INSTALL_HOOKS = ['install', 'preinstall', 'postinstall', 'preuninstall', 'postuninstall']

/**
 * @typedef {import('./metrics.js').getMetrics} getMetrics
 * @type getMetrics
 */
export async function getMetrics(nssOutput, config, rootDir) {
  let findings = []

  try {
    let rootPackageJson = JSON.parse(
      (await readFile(join(rootDir, 'package.json'), 'utf-8')) || '{}'
    )

    for (let [name, dependencyData] of Object.entries(nssOutput.dependencies)) {
      if (
        dependencyData.metadata.publishedCount === 0 ||
        (rootPackageJson.name === name && rootPackageJson.private === 'true')
      ) {
        // looks like this is a root directory of a project when running in internal-mode
        continue
      }

      for (let [version, versionData] of Object.entries(dependencyData.versions)) {
        let packageManifestObject = await pacote.manifest(`${name}@${version}`, {
          fullMetadata: true
        })
        let packument = await pacote.packument(`${name}@${version}`, {
          fullMetadata: true
        })

        findings.push({
          package: name,
          version,
          metrics: {
            ...gatherMetricsFromNodeSecScanner(
              dependencyData,
              versionData,
              config,
              packageManifestObject
            ),
            ...gatherSourceCodeRepositoryMetric(dependencyData, packageManifestObject),
            ...gatherDangerousShellCommandsMetric(packageManifestObject),
            ...(await gatherReleaseActivityMetrics(packument, version, config)),
            ...gatherOsScriptsMetric(versionData)
          }
        })
      }
    }
  } catch (error) {
    /* eslint-disable no-console */
    console.error('\nERROR: Could not gather metrics')
    throw error
    /* eslint-enable no-console */
  }

  return findings
}

/**
 * @typedef {import('./metrics.js').gatherMetricsFromNodeSecScanner} gatherMetricsFromNodeSecScanner
 * @type gatherMetricsFromNodeSecScanner
 */
export function gatherMetricsFromNodeSecScanner(
  dependencyData,
  versionData,
  config,
  packageManifestObject
) {
  let decisionMakers =
    dependencyData.metadata.publishers.length + dependencyData.metadata.maintainers.length
  let obfuscatedCodeWarns = versionData.warnings.filter(warn => warn.kind === 'obfuscated-code')

  return {
    hasTooManyDecisionMakers: {
      result: decisionMakers > config.limitOfDecisionMakers,
      value: decisionMakers
    },
    isPackageUnmaintained: {
      result: dependencyData.metadata.hasReceivedUpdateInOneYear === false,
      value: new Date(dependencyData.metadata.lastUpdateAt).toISOString().slice(0, 10)
    },
    hasInstallScripts: {
      result: versionData.flags.some(flag => flag === 'hasScript'),
      value: JSON.stringify(pick(INSTALL_HOOKS, packageManifestObject.scripts || {}))
    },
    hasObfuscatedCode: {
      result: obfuscatedCodeWarns.length > 0,
      value: obfuscatedCodeWarns
        // @ts-expect-error Bad type inference
        .map(warn => `${warn.value}-${warn.file}`)
        .join(', ')
    }
  }
}

/**
 * @typedef {import('./metrics.js').gatherSourceCodeRepositoryMetric} gatherSourceCodeRepositoryMetric
 * @type gatherSourceCodeRepositoryMetric
 */
export function gatherSourceCodeRepositoryMetric(dependencyData, packageManifestObject) {
  let hasNotSourceCodeRefInHomepage =
    typeof dependencyData.metadata.homepage !== 'string' ||
    (!dependencyData.metadata.homepage.includes('github') &&
      !dependencyData.metadata.homepage.includes('gitlab'))

  let hasNotSourceCodeRefInRepository =
    typeof packageManifestObject.repository !== 'object' ||
    typeof packageManifestObject.repository.url !== 'string' ||
    (!packageManifestObject.repository.url.includes('github') &&
      !packageManifestObject.repository.url.includes('gitlab'))

  return {
    noSourceCodeRepository: {
      result: hasNotSourceCodeRefInHomepage && hasNotSourceCodeRefInRepository,
      value: hasNotSourceCodeRefInHomepage && hasNotSourceCodeRefInRepository
    }
  }
}

/**
 * @typedef {import('./metrics.js').gatherDangerousShellCommandsMetric} gatherDangerousShellCommandsMetric
 * @type gatherDangerousShellCommandsMetric
 */
export function gatherDangerousShellCommandsMetric(packageManifestObject) {
  let NET_TOOLS = ['wget', 'curl', 'Invoke-WebRequest', 'System.Net.WebClient', 'bitsadmin']
  let PERMISSIONS_TOOLS = ['cacls', 'takeown', 'chown', 'chmod']
  let TOOLS = [...NET_TOOLS, ...PERMISSIONS_TOOLS]

  let scripts = packageManifestObject.scripts || {}
  let scriptsContent = Object.values(scripts)
    .join(' ')
    .split(' ')
    .map(command => command.toLowerCase().trim())

  let result = scriptsContent.some(word => TOOLS.some(tool => tool.toLowerCase() === word))

  return {
    scriptsHaveDangerousShellCommands: {
      result,
      value: result ? JSON.stringify(scripts) : ''
    }
  }
}

/**
 * @typedef {import('./metrics.js').gatherReleaseActivityMetrics} gatherReleaseActivityMetrics
 * @type gatherReleaseActivityMetrics
 */
export function gatherReleaseActivityMetrics(packument, version, config) {
  try {
    if (!packument || typeof packument.time !== 'object' || !packument.time) {
      return {
        packageReleasedAfterLongPeriodOfInactivity: { result: false, value: '' },
        packageVersionIsTooNew: { result: false, value: '' }
      }
    }

    let releaseDates = Object.values(omit(['modified', 'created'], packument.time))
    // @ts-expect-error TS ignored if-check above and thinks that packument.time could be an undefined
    let previousVersionIndex = releaseDates.findIndex(date => date === packument.time[version]) - 1

    let versionReleaseDate = new Date(packument.time[version].slice(0, 10))
    let limitDateOfEarliestRelease = new Date(
      new Date().setDate(new Date().getDate() - config.daysBeforeUpgradeToNewVersion)
    )

    if (releaseDates.length === 1 || !releaseDates[previousVersionIndex]) {
      // if only one version exists
      // or dependecy points to first version
      return {
        packageReleasedAfterLongPeriodOfInactivity: { result: false, value: '' },
        packageVersionIsTooNew: {
          result: versionReleaseDate > limitDateOfEarliestRelease,
          value: versionReleaseDate.toISOString().slice(0, 10)
        }
      }
    }

    let limitDateOfLongestInactivityPeriod = new Date(
      new Date(versionReleaseDate.valueOf()).setMonth(
        versionReleaseDate.getMonth() - config.monthsOfInactivityAllowed
      )
    )
    // @ts-expect-error generic types unavailable in js so we have to use unknown. 'releaseDates' will be string[], not unknown[]
    let previousReleaseDate = new Date(releaseDates[previousVersionIndex].slice(0, 10))

    return {
      packageReleasedAfterLongPeriodOfInactivity: {
        result: previousReleaseDate < limitDateOfLongestInactivityPeriod,
        value: previousReleaseDate.toISOString().slice(0, 10)
      },
      packageVersionIsTooNew: {
        result: versionReleaseDate > limitDateOfEarliestRelease,
        value: versionReleaseDate.toISOString().slice(0, 10)
      }
    }
  } catch (error) {
    /* eslint-disable no-console */
    console.error('ERROR: Could not process package packument to get activity metrics')
    /* eslint-enable no-console */
    throw error
  }
}

/**
 * @typedef {import('./metrics.js').gatherLockFileSafetyMetric} gatherLockFileSafetyMetric
 * @type gatherLockFileSafetyMetric
 */
export async function gatherLockFileSafetyMetric(lockfilePath) {
  if (!lockfilePath) {
    return { type: 'success', object: {} }
  }

  try {
    let lockfileType = lockfilePath.includes('yarn') ? 'yarn' : 'npm'
    let parser = new ParseLockfile({ lockfilePath, lockfileType })
    let lockfile = parser.parseSync()
    let validator = new ValidateHost({ packages: lockfile.object })
    return validator.validate([lockfileType], { emptyHostname: true })
  } catch (error) {
    /* eslint-disable no-console */
    console.error('ERROR: Could not process the validation of lockfile')
    /* eslint-enable no-console */
    throw error
  }
}

/**
 * @typedef {import('./metrics.js').gatherOsScriptsMetric} gatherOsScriptsMetric
 * @type gatherOsScriptsMetric
 */
export function gatherOsScriptsMetric(versionData) {
  let shellFileExtensions = ['.sh', '.bash', '.bat', '.cmd']

  let shellFiles = versionData.composition.files.filter(file =>
    shellFileExtensions.some(ext => extname(file) === ext)
  )

  return {
    hasOsScripts: {
      result: shellFiles.length > 0,
      value: shellFiles.length > 0 ? shellFiles : []
    }
  }
}
