import { Scanner } from '@nodesecure/scanner'
import { ValidationResult } from 'lockfile-lint-api'
import { ManifestResult, Packument } from 'pacote'

import { Config } from '../index'

export declare type Metrics = {
  package: string
  version: string
  metrics: {
    hasTooManyDecisionMakers: { result: boolean; value: number }
    isPackageUnmaintained: { result: boolean; value: string }
    hasInstallScripts: { result: boolean; value: string }
    hasObfuscatedCode: { result: boolean; value: string }
    noSourceCodeRepository: { result: boolean; value: boolean }
    scriptsHaveDangerousShellCommands: { result: boolean; value: string }
    packageReleasedAfterLongPeriodOfInactivity: { result: boolean; value: string }
    packageVersionIsTooNew: { result: boolean; value: string }
    hasOsScripts: { result: boolean; value: string[] }
  }
}

export declare function getMetrics(
  nssOutput: Scanner.Payload,
  config: Config,
  rootDir: string
): Promise<Metrics[]>

export declare function gatherMetricsFromNodeSecScanner(
  dependencyData: Scanner.Payload['dependencies'][0],
  versionData: Scanner.Payload['dependencies'][0]['versions'][0],
  config: Config,
  packageManifestObject: ManifestResult
): {
  hasTooManyDecisionMakers: { result: boolean; value: number }
  isPackageUnmaintained: { result: boolean; value: string }
  hasObfuscatedCode: { result: boolean; value: string }
  hasInstallScripts: { result: boolean; value: string }
}

export declare function gatherSourceCodeRepositoryMetric(
  dependencyData: Scanner.Payload['dependencies'][0],
  packageManifestObject: ManifestResult
): {
  noSourceCodeRepository: { result: boolean; value: boolean }
}

export declare function gatherDangerousShellCommandsMetric(packageManifestObject: ManifestResult): {
  scriptsHaveDangerousShellCommands: { result: boolean; value: string }
}

export declare function gatherReleaseActivityMetrics(
  packument: Packument,
  version: string,
  config: Config
): {
  packageReleasedAfterLongPeriodOfInactivity: { result: boolean; value: string }
  packageVersionIsTooNew: { result: boolean; value: string }
}

export declare function gatherLockFileSafetyMetric(lockfilePath: string): Promise<ValidationResult>

export declare function gatherOsScriptsMetric(
  versionData: Scanner.Payload['dependencies'][0]['versions'][0]
): { hasOsScripts: { result: boolean; value: string[] } }
