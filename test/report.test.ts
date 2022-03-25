import { test } from 'uvu'
import { equal, throws } from 'uvu/assert'
import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

import {
  createReport,
  getMetricMessageForReport,
  isIgnoredMetric,
  // @ts-expect-error Does not see this object
  SDC_CHECK_METRICS_ALIASES
} from '../src/report.js'
import { Config, SdcCheckMetric } from '../index.js'
import { Metrics } from '../src/metrics.js'
import { IgnoredPackages } from '../src/utils.js'
import { ValidationResult } from 'lockfile-lint-api'

const __dirname = dirname(fileURLToPath(import.meta.url))
const defaultConfigSnapshot = join(__dirname, 'snapshots', 'default-config.json')

test('report -> createReport: should work properly with custom config and ignored packages', async () => {
  let config = JSON.parse(await readFile(defaultConfigSnapshot, 'utf-8'))
  let findings = [
    {
      package: 'sdc-check',
      version: '0.1.0',
      metrics: {
        hasInstallScripts: { result: true, value: 'qwe' },
        hasObfuscatedCode: { result: true, value: 'qwe' },
        hasOsScripts: { result: true, value: ['qwe'] },
        hasTooManyDecisionMakers: { result: true, value: 1 },
        isPackageUnmaintained: { result: true, value: 'qwe' },
        noSourceCodeRepository: { result: true, value: true },
        packageReleasedAfterLongPeriodOfInactivity: { result: true, value: 'qwe' },
        packageVersionIsTooNew: { result: true, value: 'qwe' },
        scriptsHaveDangerousShellCommands: { result: true, value: 'qwe' }
      }
    },
    {
      package: 'sdc-check',
      version: '0.2.0',
      metrics: {
        hasInstallScripts: { result: false, value: 'qwe' },
        hasObfuscatedCode: { result: false, value: 'qwe' },
        hasOsScripts: { result: false, value: ['qwe'] },
        hasTooManyDecisionMakers: { result: false, value: 1 },
        isPackageUnmaintained: { result: false, value: 'qwe' },
        noSourceCodeRepository: { result: false, value: true },
        packageReleasedAfterLongPeriodOfInactivity: { result: true, value: 'qwe' },
        packageVersionIsTooNew: { result: true, value: 'qwe' },
        scriptsHaveDangerousShellCommands: { result: true, value: 'qwe' }
      }
    },
    {
      package: 'sdc-inside',
      version: '0.1.0',
      metrics: {
        hasInstallScripts: { result: true, value: 'qwe' },
        hasObfuscatedCode: { result: true, value: 'qwe' },
        hasOsScripts: { result: true, value: ['qwe'] },
        hasTooManyDecisionMakers: { result: true, value: 1 },
        isPackageUnmaintained: { result: true, value: 'qwe' },
        noSourceCodeRepository: { result: true, value: true },
        packageReleasedAfterLongPeriodOfInactivity: { result: true, value: 'qwe' },
        packageVersionIsTooNew: { result: true, value: 'qwe' },
        scriptsHaveDangerousShellCommands: { result: true, value: 'qwe' }
      }
    }
  ]

  equal(
    createReport({
      findings,
      lockFileIsNotSafe: {
        type: 'error',
        errors: [
          { message: 'detected invalid origin for package: @test/data', package: '@test/data' }
        ]
      },
      ignoredPackages: {
        'sdc-check@0.2.0': ['released-after-long-period-of-inactivity', 'package-is-too-new'],
        'sdc-inside': true
      },
      config: {
        ...config,
        errors: [
          'lockfile-is-not-safe',
          'too-many-decision-makers',
          'unmaintained-package',
          'install-scripts',
          'no-source-code',
          'dangerous-shell-commands',
          'released-after-long-period-of-inactivity',
          'package-is-too-new',
          'has-os-scripts',
          'obfuscated-code'
        ]
      }
    }),
    {
      type: 'error',
      errors: [
        {
          metric: 'lockfile-is-not-safe',
          message: 'detected invalid origin for package: @test/data',
          package: '@test/data'
        },
        {
          metric: 'too-many-decision-makers',
          package: 'sdc-check@0.1.0',
          message: 'count of decision makers is 1'
        },
        {
          metric: 'unmaintained-package',
          package: 'sdc-check@0.1.0',
          message: 'package last update date is qwe'
        },
        {
          metric: 'install-scripts',
          package: 'sdc-check@0.1.0',
          message: 'install scripts found: qwe'
        },
        {
          metric: 'no-source-code',
          package: 'sdc-check@0.1.0',
          message: 'could not find references to source code repository'
        },
        {
          metric: 'dangerous-shell-commands',
          package: 'sdc-check@0.1.0',
          message: 'shell commands found: qwe'
        },
        {
          metric: 'released-after-long-period-of-inactivity',
          package: 'sdc-check@0.1.0',
          message: 'previous package release date is qwe'
        },
        {
          metric: 'package-is-too-new',
          package: 'sdc-check@0.1.0',
          message: 'package release date is qwe'
        },
        {
          metric: 'has-os-scripts',
          package: 'sdc-check@0.1.0',
          message: 'os scripts found: [qwe]'
        },
        {
          metric: 'obfuscated-code',
          package: 'sdc-check@0.1.0',
          message: 'obfuscated code found: qwe'
        },
        {
          metric: 'dangerous-shell-commands',
          package: 'sdc-check@0.2.0',
          message: 'shell commands found: qwe'
        }
      ],
      warnings: []
    }
  )
})

test('report -> createReport: should work properly', async () => {
  let config = JSON.parse(await readFile(defaultConfigSnapshot, 'utf-8'))
  let findings = JSON.parse(
    await readFile(join(__dirname, 'snapshots', 'estimo-findings.json'), 'utf-8')
  )
  let report = JSON.parse(
    await readFile(join(__dirname, 'snapshots', 'estimo-report.json'), 'utf-8')
  )

  equal(
    createReport({
      findings,
      lockFileIsNotSafe: {
        type: 'error',
        errors: [
          { message: 'detected invalid origin for package: @test/data', package: '@test/data' }
        ]
      },
      ignoredPackages: {},
      config
    }),
    report
  )
})

test('report -> createReport: should work properly with different values of lockFileIsNotSafe', async () => {
  let config = JSON.parse(await readFile(defaultConfigSnapshot, 'utf-8'))
  let findings = [
    {
      package: 'sdc-check',
      version: '0.1.0',
      metrics: {
        hasInstallScripts: { result: false, value: 'qwe' },
        hasObfuscatedCode: { result: false, value: 'qwe' },
        hasOsScripts: { result: false, value: ['qwe'] },
        hasTooManyDecisionMakers: { result: false, value: 1 },
        isPackageUnmaintained: { result: false, value: 'qwe' },
        noSourceCodeRepository: { result: false, value: false },
        packageReleasedAfterLongPeriodOfInactivity: { result: false, value: 'qwe' },
        packageVersionIsTooNew: { result: false, value: 'qwe' },
        scriptsHaveDangerousShellCommands: { result: false, value: 'qwe' }
      }
    }
  ]

  equal(
    createReport({
      findings,
      lockFileIsNotSafe: { type: 'success', object: {} },
      ignoredPackages: {},
      config
    }),
    {
      type: 'success',
      errors: [],
      warnings: []
    }
  )

  equal(
    createReport({
      findings,
      lockFileIsNotSafe: { type: 'error', errors: [{ message: 'asd', package: 'test' }] },
      ignoredPackages: {},
      config
    }),
    {
      type: 'error',
      errors: [{ metric: 'lockfile-is-not-safe', message: 'asd', package: 'test' }],
      warnings: []
    }
  )
})

test('report -> createReport: should exit with error when data was not provided', async () => {
  let defaultConfig = JSON.parse(await readFile(defaultConfigSnapshot, 'utf-8'))

  throws(() => {
    createReport({
      findings: [],
      lockFileIsNotSafe: { type: 'success', object: {} },
      ignoredPackages: {},
      config: defaultConfig
    })
  }, /There are no metrics data to create report/)

  throws(() => {
    createReport(
      {} as {
        findings: Metrics[]
        lockFileIsNotSafe: ValidationResult
        ignoredPackages: IgnoredPackages
        config: Config
      }
    )
  }, /There are no metrics data to create report/)

  throws(() => {
    createReport(
      null as unknown as {
        findings: Metrics[]
        lockFileIsNotSafe: ValidationResult
        ignoredPackages: IgnoredPackages
        config: Config
      }
    )
  }, /There are no metrics data to create report/)

  throws(() => {
    createReport({
      findings: [],
      lockFileIsNotSafe: null as unknown as ValidationResult,
      ignoredPackages: {},
      config: defaultConfig
    })
  }, /There are no metrics data to create report/)
})

test('report -> getMetricMessageForReport: should work properly', async () => {
  let messages = Object.values(SDC_CHECK_METRICS_ALIASES).map(metric =>
    getMetricMessageForReport(
      metric as SdcCheckMetric,
      metric === 'has-os-scripts' ? ['1', '2'] : 'qwe'
    )
  )

  equal(messages, [
    'n/a',
    'count of decision makers is qwe',
    'package last update date is qwe',
    'install scripts found: qwe',
    'could not find references to source code repository',
    'shell commands found: qwe',
    'previous package release date is qwe',
    'package release date is qwe',
    'os scripts found: [1, 2]',
    'obfuscated code found: qwe'
  ])
})

test('report -> isIgnoredMetric: should work properly in positive case', async () => {
  equal(
    isIgnoredMetric('too-many-decision-makers', 'package@version', { 'package@version': true }),
    true
  )
  equal(
    isIgnoredMetric('too-many-decision-makers', 'package@version', {
      'package@version': ['too-many-decision-makers']
    }),
    true
  )
  equal(
    isIgnoredMetric('too-many-decision-makers', 'package@version', {
      'package@version': true
    }),
    true
  )
  equal(
    isIgnoredMetric('too-many-decision-makers', 'package@2.0.0', {
      'package@2.0.0': ['no-source-code', 'unmaintained-package', 'too-many-decision-makers']
    }),
    true
  )
  equal(
    isIgnoredMetric('too-many-decision-makers', 'package', {
      package: ['too-many-decision-makers', 'no-source-code', 'unmaintained-package']
    }),
    true
  )
})

test('report -> isIgnoredMetric: should work properly in negative case', async () => {
  equal(isIgnoredMetric('too-many-decision-makers', 'package@version', {}), false)
  equal(
    isIgnoredMetric('too-many-decision-makers', 'package@version', {
      'package@version': ['no-source-code', 'unmaintained-package']
    }),
    false
  )
  equal(
    isIgnoredMetric('too-many-decision-makers', 'package@2.0.0', {
      'package@version': ['no-source-code', 'unmaintained-package'],
      'package@1.0.0': ['too-many-decision-makers']
    }),
    false
  )
  equal(
    isIgnoredMetric('too-many-decision-makers', 'package@2.0.0', {
      asd: ['no-source-code', 'unmaintained-package'],
      qwe: ['too-many-decision-makers']
    }),
    false
  )
})
