import { IgnoredPackages } from './src/utils'

export type SdcCheckMetric =
  | 'dangerous-shell-commands'
  | 'package-is-too-new'
  | 'lockfile-is-not-safe'
  | 'obfuscated-code'
  | 'released-after-long-period-of-inactivity'
  | 'too-many-decision-makers'
  | 'unmaintained-package'
  | 'install-scripts'
  | 'no-source-code'
  | 'has-os-scripts'

export type Config = {
  limitOfDecisionMakers: number
  monthsOfInactivityAllowed: number
  daysBeforeUpgradeToNewVersion: number
  errors: Array<SdcCheckMetric>
}

export type Report = {
  type: 'success' | 'error' | 'none'
  errors: { metric: SdcCheckMetric; package: string; message: string }[]
  warnings: { metric: SdcCheckMetric; package: string; message: string }[]
}

export declare function check(options: {
  rootDir?: string
  packageName?: string
  version?: string
  config?: Config
  ignoredPackages?: IgnoredPackages
}): Promise<Report>
