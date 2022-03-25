import { test } from 'uvu'
import { equal, snapshot } from 'uvu/assert'
import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

import { loadIgnoreFile, loadConfig } from '../src/utils.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const defaultConfigSnapshot = join(__dirname, 'snapshots', 'default-config.json')

test('utils -> loadIgnoreFile: should be empty when ignore file does not exist', async () => {
  let ignoredPackages = await loadIgnoreFile(join(__dirname, 'stub', 'ignore', 'qweqweqweq'))
  equal(ignoredPackages, {})
})

test('utils -> loadIgnoreFile: should be empty when ignore exist but it is empty', async () => {
  let ignoredPackages = await loadIgnoreFile(join(__dirname, 'stub', 'ignore', '2'))
  equal(ignoredPackages, {})
})

test('utils -> loadIgnoreFile: should correctly parse ignoring options', async () => {
  let ignoredPackages = await loadIgnoreFile(join(__dirname, 'stub', 'ignore', '1'))
  equal(ignoredPackages, {
    'sdc-check': ['unmaintained-package', 'released-after-long-period-of-inactivity'],
    'sdc-check@1.0.0': ['has-os-scripts', 'lockfile-is-not-safe'],
    'sdc-check@2.0.0': true
  })
})

test('utils -> loadConfig: should return default config mode=external', async () => {
  let config = await loadConfig('external', '')
  let defaultConfig = await readFile(defaultConfigSnapshot, 'utf-8')
  snapshot(JSON.stringify(config, null, 2), defaultConfig)
})

test('utils -> loadConfig: should return default config if package.json in root dir is not exist', async () => {
  let config = await loadConfig('internal', join(__dirname, 'stub', 'config', 'wqsdasdasda'))
  let defaultConfig = await readFile(defaultConfigSnapshot, 'utf-8')
  snapshot(JSON.stringify(config, null, 2), defaultConfig)
})

test('utils -> loadConfig: should return default config if custom config does not have valid settings', async () => {
  let config = await loadConfig('internal', join(__dirname, 'stub', 'config', '3'))
  let defaultConfig = await readFile(defaultConfigSnapshot, 'utf-8')
  snapshot(JSON.stringify(config, null, 2), defaultConfig)
})

test('utils -> loadConfig: should use custom options instead of default options', async () => {
  let config = await loadConfig('internal', join(__dirname, 'stub', 'config', '1'))
  let customOptionsConfig = await readFile(
    join(__dirname, 'snapshots', 'custom-options-config.json'),
    'utf-8'
  )
  snapshot(JSON.stringify(config, null, 2), customOptionsConfig)
})

test('utils -> loadConfig: should use custom errors instead of default errors', async () => {
  let config = await loadConfig('internal', join(__dirname, 'stub', 'config', '2'))
  let customErrorsConfig = await readFile(
    join(__dirname, 'snapshots', 'custom-errors-config.json'),
    'utf-8'
  )
  snapshot(JSON.stringify(config, null, 2), customErrorsConfig)
})

test.run()
