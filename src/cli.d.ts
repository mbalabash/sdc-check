import { OptionValues } from 'commander'
import { SdcCheckMetric } from '..'

export declare function printErrorsInfo(
  reportedItems: { metric: SdcCheckMetric; package: string; message: string }[],
  cliOptions: OptionValues
): void

export declare function printWarningsInfo(
  reportedItems: { metric: SdcCheckMetric; package: string; message: string }[],
  cliOptions: OptionValues
): void

export declare function getReportStatsInfo(
  reportedItems: { metric: SdcCheckMetric; package: string; message: string }[]
): string
