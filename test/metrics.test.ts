import { test } from 'uvu'
import { equal, snapshot } from 'uvu/assert'
import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

import {
  getMetrics,
  gatherMetricsFromNodeSecScanner,
  gatherSourceCodeRepositoryMetric,
  gatherDangerousShellCommandsMetric,
  gatherReleaseActivityMetrics,
  gatherLockFileSafetyMetric,
  gatherOsScriptsMetric
} from '../src/metrics.js'
import Scanner from '@nodesecure/scanner/types/scanner'
import { ManifestResult, Packument } from 'pacote'

const __dirname = dirname(fileURLToPath(import.meta.url))
const defaultConfigSnapshot = join(__dirname, 'snapshots', 'default-config.json')

test('metrics -> getMetrics: should work properly', async () => {
  let config = JSON.parse(await readFile(defaultConfigSnapshot, 'utf-8'))
  let estimoFrom = JSON.parse(
    await readFile(join(__dirname, 'snapshots', 'from-estimo-output.json'), 'utf-8')
  )
  let estimoFindings = JSON.parse(
    await readFile(join(__dirname, 'snapshots', 'estimo-findings.json'), 'utf-8')
  )

  equal(await getMetrics(estimoFrom, config, join(__dirname, 'stub/config/1')), estimoFindings)
})

test('metrics -> getMetrics: should work properly for private package', async () => {
  let config = JSON.parse(await readFile(defaultConfigSnapshot, 'utf-8'))
  let estimoFrom = JSON.parse(
    await readFile(join(__dirname, 'snapshots', 'from-private-output.json'), 'utf-8')
  )

  equal(await getMetrics(estimoFrom, config, join(__dirname, 'stub/config/4')), [])
})

test('metrics -> gatherMetricsFromNodeSecScanner: should work properly in positive case', async () => {
  let defaultConfig = JSON.parse(await readFile(defaultConfigSnapshot, 'utf-8'))
  let lastUpdateAt = new Date(new Date().setMonth(new Date().getMonth() - 13))

  equal(
    gatherMetricsFromNodeSecScanner(
      {
        metadata: {
          publishers: [1, 2, 3, 4, 5, 6, 7],
          maintainers: [1, 2, 3, 4, 5],
          lastUpdateAt,
          hasReceivedUpdateInOneYear: false
        }
      } as unknown as Scanner.Payload['dependencies'][0],
      {
        warnings: [
          { kind: 'obfuscated-code', value: 'qwe', file: 'asd.js' },
          { kind: 'obfuscated-code', value: 'qwe', file: 'zxc.js' }
        ],
        flags: ['hasScript']
      } as unknown as Scanner.Payload['dependencies'][0]['versions'][0],
      defaultConfig,
      {
        scripts: { install: 'curl ...', dev: 'qwe', build: 'asd zxc', postinstall: 'chmod ...' }
      } as unknown as ManifestResult
    ),
    {
      hasTooManyDecisionMakers: {
        result: true,
        value: 12
      },
      isPackageUnmaintained: {
        result: true,
        value: lastUpdateAt.toISOString().slice(0, 10)
      },
      hasInstallScripts: {
        result: true,
        value: JSON.stringify({ install: 'curl ...', postinstall: 'chmod ...' })
      },
      hasObfuscatedCode: {
        result: true,
        value: 'qwe-asd.js, qwe-zxc.js'
      }
    }
  )
})

test('metrics -> gatherMetricsFromNodeSecScanner: should work properly in negative case', async () => {
  let defaultConfig = JSON.parse(await readFile(defaultConfigSnapshot, 'utf-8'))
  let lastUpdateAt = new Date()

  equal(
    gatherMetricsFromNodeSecScanner(
      {
        metadata: { publishers: [1], maintainers: [1], lastUpdateAt }
      } as unknown as Scanner.Payload['dependencies'][0],
      {
        warnings: [''],
        flags: ['']
      } as unknown as Scanner.Payload['dependencies'][0]['versions'][0],
      defaultConfig,
      { scripts: {} } as unknown as ManifestResult
    ),
    {
      hasTooManyDecisionMakers: {
        result: false,
        value: 2
      },
      isPackageUnmaintained: {
        result: false,
        value: lastUpdateAt.toISOString().slice(0, 10)
      },
      hasInstallScripts: {
        result: false,
        value: JSON.stringify({})
      },
      hasObfuscatedCode: {
        result: false,
        value: ''
      }
    }
  )
})

test('metrics -> gatherSourceCodeRepositoryMetric: should work properly in positive case', async () => {
  equal(
    gatherSourceCodeRepositoryMetric(
      { metadata: { homepage: 'github...' } } as Scanner.Payload['dependencies'][0],
      { repository: { url: 'github...' } } as unknown as ManifestResult
    ),
    {
      noSourceCodeRepository: {
        result: false,
        value: false
      }
    }
  )

  equal(
    gatherSourceCodeRepositoryMetric(
      { metadata: { homepage: 'gitlab...' } } as Scanner.Payload['dependencies'][0],
      { repository: { url: 'gitlab...' } } as unknown as ManifestResult
    ),
    {
      noSourceCodeRepository: {
        result: false,
        value: false
      }
    }
  )
})

test('metrics -> gatherSourceCodeRepositoryMetric: should work properly in negative case', async () => {
  equal(
    gatherSourceCodeRepositoryMetric(
      { metadata: {} } as Scanner.Payload['dependencies'][0],
      { repository: {} } as unknown as ManifestResult
    ),
    {
      noSourceCodeRepository: {
        result: true,
        value: true
      }
    }
  )

  equal(
    gatherSourceCodeRepositoryMetric(
      { metadata: { homepage: '' } } as Scanner.Payload['dependencies'][0],
      { repository: { url: '' } } as unknown as ManifestResult
    ),
    {
      noSourceCodeRepository: {
        result: true,
        value: true
      }
    }
  )
})

test('metrics -> gatherDangerousShellCommandsMetric: should work properly in positive case', async () => {
  let scripts1 = {
    install: 'asdasd asd asda asda s',
    postinstall: 'asdasd asd asda asda s',
    start: 'wget ...'
  }
  equal(
    gatherDangerousShellCommandsMetric({
      scripts: scripts1
    } as unknown as ManifestResult),
    {
      scriptsHaveDangerousShellCommands: {
        result: true,
        value: JSON.stringify(scripts1)
      }
    }
  )

  let scripts2 = {
    install: 'asdasd asd asda asda s',
    postinstall: 'asdasd curl asda chmod s',
    preinstall: 'asdasd asd asda asda s',
    dev: 'sada bitsadmin ada'
  }
  equal(
    gatherDangerousShellCommandsMetric({
      scripts: scripts2
    } as unknown as ManifestResult),
    {
      scriptsHaveDangerousShellCommands: {
        result: true,
        value: JSON.stringify(scripts2)
      }
    }
  )

  let scripts3 = {
    install: 'asdasd asd asda asda cacls',
    postinstall: 'asdasd 1233 asda chmod s',
    preinstall: 'asdasd asd asda asda s',
    dev: 'ada'
  }
  equal(
    gatherDangerousShellCommandsMetric({
      scripts: scripts3
    } as unknown as ManifestResult),
    {
      scriptsHaveDangerousShellCommands: {
        result: true,
        value: JSON.stringify(scripts3)
      }
    }
  )
})

test('metrics -> gatherDangerousShellCommandsMetric: should work properly in negative case', async () => {
  equal(gatherDangerousShellCommandsMetric({} as ManifestResult), {
    scriptsHaveDangerousShellCommands: {
      result: false,
      value: ''
    }
  })

  equal(gatherDangerousShellCommandsMetric({ scripts: {} } as unknown as ManifestResult), {
    scriptsHaveDangerousShellCommands: {
      result: false,
      value: ''
    }
  })

  equal(
    gatherDangerousShellCommandsMetric({
      scripts: { install: 'asdasd asd asda asda s' }
    } as unknown as ManifestResult),
    {
      scriptsHaveDangerousShellCommands: {
        result: false,
        value: ''
      }
    }
  )
})

test('metrics -> gatherReleaseActivityMetrics: should work properly with unexisted package', async () => {
  let defaultConfig = JSON.parse(await readFile(defaultConfigSnapshot, 'utf-8'))

  equal(gatherReleaseActivityMetrics({} as Packument, '', defaultConfig), {
    packageReleasedAfterLongPeriodOfInactivity: { result: false, value: '' },
    packageVersionIsTooNew: { result: false, value: '' }
  })
})

test('metrics -> gatherReleaseActivityMetrics: should work properly when only one package version exists', async () => {
  let defaultConfig = JSON.parse(await readFile(defaultConfigSnapshot, 'utf-8'))
  let packument = JSON.parse(
    await readFile(join(__dirname, 'snapshots', 'package-one-version.json'), 'utf-8')
  )

  equal(gatherReleaseActivityMetrics(packument, '0.1.3', defaultConfig), {
    packageReleasedAfterLongPeriodOfInactivity: { result: false, value: '' },
    packageVersionIsTooNew: { result: false, value: '2019-04-15' }
  })
})

test('metrics -> gatherReleaseActivityMetrics: should work properly in positive case', async () => {
  let defaultConfig = JSON.parse(await readFile(defaultConfigSnapshot, 'utf-8'))
  let packument = JSON.parse(
    await readFile(join(__dirname, 'snapshots', 'package-few-versions.json'), 'utf-8')
  )
  let prevVersion = '2.2.9'
  let version = '2.3.0'
  let today = new Date().toISOString()
  let tooMuchBefore = new Date(
    new Date(today).setMonth(new Date().getMonth() - defaultConfig.monthsOfInactivityAllowed - 1)
  ).toISOString()

  packument.time[prevVersion] = tooMuchBefore
  packument.time[version] = today

  equal(gatherReleaseActivityMetrics(packument, version, defaultConfig), {
    packageReleasedAfterLongPeriodOfInactivity: {
      result: true,
      value: tooMuchBefore.slice(0, 10)
    },
    packageVersionIsTooNew: { result: true, value: today.slice(0, 10) }
  })
})

test('metrics -> gatherReleaseActivityMetrics: should work properly in negative case', async () => {
  let defaultConfig = JSON.parse(await readFile(defaultConfigSnapshot, 'utf-8'))
  let packument = JSON.parse(
    await readFile(join(__dirname, 'snapshots', 'package-few-versions.json'), 'utf-8')
  )

  equal(gatherReleaseActivityMetrics(packument, '2.3.0', defaultConfig), {
    packageReleasedAfterLongPeriodOfInactivity: { result: false, value: '2021-10-07' },
    packageVersionIsTooNew: { result: false, value: '2021-11-16' }
  })
})

test('metrics -> gatherLockFileSafetyMetric: should work properly', async () => {
  equal(await gatherLockFileSafetyMetric(''), { type: 'success', object: {} })

  equal(await gatherLockFileSafetyMetric(join(__dirname, '..', 'yarn.lock')), {
    type: 'success',
    errors: []
  })

  equal(await gatherLockFileSafetyMetric(join(__dirname, 'stub', 'lock', 'yarn.lock')), {
    type: 'error',
    errors: [
      {
        message:
          'detected invalid host(s) for package: @gar/promisify@^1.0.1\n    expected: registry.yarnpkg.com\n    actual: registr33y.yarnpkgg1.com\n',
        package: '@gar/promisify@^1.0.1'
      },
      {
        message:
          'detected invalid host(s) for package: @gar/promisify@^1.1.3\n    expected: registry.yarnpkg.com\n    actual: registr33y.yarnpkgg1.com\n',
        package: '@gar/promisify@^1.1.3'
      }
    ]
  })
})

test('metrics -> gatherOsScriptsMetric: should work properly', async () => {
  equal(
    gatherOsScriptsMetric({
      composition: { files: [] }
    } as unknown as Scanner.Payload['dependencies'][0]['versions'][0]),
    {
      hasOsScripts: {
        result: false,
        value: []
      }
    }
  )

  equal(
    gatherOsScriptsMetric({
      composition: { files: ['qwe.txt', 'asd.js', 'zxc.zip', 'qaz.jpeg'] }
    } as unknown as Scanner.Payload['dependencies'][0]['versions'][0]),
    {
      hasOsScripts: {
        result: false,
        value: []
      }
    }
  )

  equal(
    gatherOsScriptsMetric({
      composition: { files: ['1.bat', '2.sh', '3.bash', '4.cmd'] }
    } as unknown as Scanner.Payload['dependencies'][0]['versions'][0]),
    {
      hasOsScripts: {
        result: true,
        value: ['1.bat', '2.sh', '3.bash', '4.cmd']
      }
    }
  )
})

test.run()
