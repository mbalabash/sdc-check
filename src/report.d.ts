import { ValidationResult } from 'lockfile-lint-api'

import { Config, Report, SdcCheckMetric } from '../index'
import { IgnoredPackages } from './utils'
import { Metrics } from './metrics'

export type METRICS_ALIASES = {
  lockFileIsNotSafe: 'lockfile-is-not-safe'
  hasTooManyDecisionMakers: 'too-many-decision-makers'
  isPackageUnmaintained: 'unmaintained-package'
  hasInstallScripts: 'install-scripts'
  noSourceCodeRepository: 'no-source-code'
  hasObfuscatedCode: 'obfuscated-code'
  scriptsHaveDangerousShellCommands: 'dangerous-shell-commands'
  packageReleasedAfterLongPeriodOfInactivity: 'released-after-long-period-of-inactivity'
  packageVersionIsTooNew: 'package-is-too-new'
  hasOsScripts: 'has-os-scripts'
}

export declare function createReport(options?: {
  findings: Metrics[]
  lockFileIsNotSafe: ValidationResult
  ignoredPackages: IgnoredPackages
  config: Config
}): Report

export declare function initReport(): Report

export declare function getReportLevel(config: Config, key: SdcCheckMetric): 'errors' | 'warnings'

export declare function getReportMetricKeys(
  aliases: METRICS_ALIASES
): Exclude<keyof METRICS_ALIASES, 'lockFileIsNotSafe'>[]

export declare function getMetricMessageForReport(
  metric: SdcCheckMetric,
  value: string | string[] | number | boolean
): string

export declare function isIgnoredMetric(
  metric: string,
  spec: string,
  ignoredPackages: IgnoredPackages
): boolean
