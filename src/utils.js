import { access, readFile } from 'fs/promises'
import { join } from 'path'
import { constants } from 'fs'

const PACKAGE_JSON_CONFIG_KEY = 'sdc-check'
const IGNORE_FILE_NAME = '.sdccheckignore'

const defaultOptionsConfig = {
  limitOfDecisionMakers: 7,
  daysBeforeUpgradeToNewVersion: 5,
  monthsOfInactivityAllowed: 10
}

/**
 * @typedef {import('../index').Config['errors']} errors
 * @type errors
 */
const defaultErrorsConfig = [
  'package-is-too-new',
  'lockfile-is-not-safe',
  'has-os-scripts',
  'dangerous-shell-commands'
]

/**
 * @typedef {import('./utils.js').resolveMode} resolveMode
 * @type resolveMode
 */
export function resolveMode(directory) {
  return typeof directory === 'string' && directory.length > 0 ? 'internal' : 'external'
}

/**
 * @typedef {import('./utils.js').loadConfig} loadConfig
 * @type loadConfig
 */
export async function loadConfig(mode, directory) {
  try {
    if (mode === 'external') {
      return { ...defaultOptionsConfig, errors: defaultErrorsConfig }
    }

    let PATH_TO_PACKAGE_JSON = join(directory, 'package.json')
    let hasPackageJsonInTargetDir = await isFileExist(PATH_TO_PACKAGE_JSON)
    if (!hasPackageJsonInTargetDir) {
      return { ...defaultOptionsConfig, errors: defaultErrorsConfig }
    }

    let packageJson = JSON.parse((await readFile(PATH_TO_PACKAGE_JSON, 'utf-8')) || '{}')
    let config =
      packageJson[PACKAGE_JSON_CONFIG_KEY] &&
      Object.keys(packageJson[PACKAGE_JSON_CONFIG_KEY]).length > 0
        ? {
            ...defaultOptionsConfig,
            ...(packageJson[PACKAGE_JSON_CONFIG_KEY].options || {}),
            errors: Array.isArray(packageJson[PACKAGE_JSON_CONFIG_KEY].errors)
              ? packageJson[PACKAGE_JSON_CONFIG_KEY].errors
              : defaultErrorsConfig
          }
        : { ...defaultOptionsConfig, errors: defaultErrorsConfig }

    return config
  } catch (error) {
    /* eslint-disable no-console */
    console.error('ERROR: Could not read config from package.json')
    throw error
    /* eslint-enable no-console */
  }
}

/**
 * @typedef {import('./utils.js').loadIgnoreFile} loadIgnoreFile
 * @type loadIgnoreFile
 */
export async function loadIgnoreFile(directory) {
  let PATH_TO_IGNORE_FILE = join(directory, IGNORE_FILE_NAME)

  try {
    if (!directory || !(await isFileExist(PATH_TO_IGNORE_FILE))) {
      return {}
    }

    let content = await readFile(PATH_TO_IGNORE_FILE, 'utf-8')

    return Object.fromEntries(
      content
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(rule => {
          if (rule.includes('|')) {
            let [spec, args] = rule.split('|')
            spec = spec.trim()
            let metrics = args
              .split(',')
              .map(metric => metric.trim())
              .filter(Boolean)
            return [spec, metrics.length > 0 ? metrics : true]
          }
          return [rule.trim(), true]
        })
    )
  } catch (error) {
    /* eslint-disable no-console */
    console.error(`ERROR: Could not read ignore file from ${PATH_TO_IGNORE_FILE}`)
    throw error
    /* eslint-enable no-console */
  }
}

/**
 * @typedef {import('./utils.js').findLockFilePath} findLockFilePath
 * @type findLockFilePath
 */
export async function findLockFilePath(mode, directory) {
  if (mode === 'external') {
    return ''
  }

  let PATH_TO_PACKAGE_LOCK = join(directory, 'package-lock.json')
  let PATH_TO_YARN_LOCK = join(directory, 'yarn.lock')

  try {
    if (await isFileExist(PATH_TO_PACKAGE_LOCK)) {
      return PATH_TO_PACKAGE_LOCK
    }

    if (await isFileExist(PATH_TO_YARN_LOCK)) {
      return PATH_TO_YARN_LOCK
    }

    return ''
  } catch (error) {
    /* eslint-disable no-console */
    console.error('ERROR: Could not find package lockfile')
    throw error
    /* eslint-enable no-console */
  }
}

/**
 * @typedef {import('./utils.js').omit} omit
 * @type omit
 */
export function omit(keys, object) {
  return Object.fromEntries(Object.entries(object).filter(([k]) => !keys.includes(k)))
}

/**
 * @typedef {import('./utils.js').pick} pick
 * @type pick
 */
export function pick(keys, object) {
  return Object.fromEntries(Object.entries(object).filter(([k]) => keys.includes(k)))
}

/**
 * @typedef {import('./utils.js').isFileExist} isFileExist
 * @type isFileExist
 */
async function isFileExist(filePath) {
  try {
    await access(filePath, constants.R_OK)
    return true
  } catch (error) {
    return false
  }
}
