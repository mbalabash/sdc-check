#!/usr/bin/env node

import { Command } from 'commander'
import { createSpinner } from 'nanospinner'
import { resolve } from 'node:path'
import { exit } from 'node:process'
/* eslint-disable no-console */
import pc from 'picocolors'

import { check } from '../index.js'

const program = new Command()

program
  .name('sdc-check')
  .description(
    'Easy-to-use tool to inform you about potential risks in your project dependencies list'
  )
  .option('-d <string>', 'root directory')
  .option('-p <string>', 'package name')
  .option('-v <string>', 'package version')
  .option('-f, --full', 'show all information about errors and warnings')
  .option('-s, --short', 'show only stats on errors and warnings')
  .addHelpText(
    'after',
    `
Examples:
  $ sdc-check -d ./Projects/work/example
  $ sdc-check -p express -v 4.17.3
  $ sdc-check -p express`
  )

program.parse(process.argv)
;(async () => {
  let cliOptions = program.opts()
  let sdcOptions = {
    packageName: cliOptions.p,
    rootDir: typeof cliOptions.d === 'string' ? resolve(cliOptions.d) : undefined,
    version: cliOptions.v
  }
  let spinner = createSpinner('Running sdc-check')
  let report

  try {
    spinner.start()
    report = await check(sdcOptions)
    spinner.clear()

    if (report.type === "none"){
      throw new Error("sdc-check internal error")
    }

    printErrorsInfo(report.errors, cliOptions)
    printWarningsInfo(report.warnings, cliOptions)

    if (report.type === 'error') {
      spinner.error({ mark: '\n🚨', text: pc.red('sdc-check has found errors') })
      exit(1)
    } else {
      spinner.success({ mark: '\n✅', text: pc.green('sdc-check completed without any errors') })
    }
  } catch (error) {
    console.error(error)
    spinner.error({ mark: '\n🚫', text: pc.red('sdc-check exited with error') })
  }
})()

/**
 * @typedef {import('./cli').getReportStatsInfo} getReportStatsInfo
 * @type getReportStatsInfo
 */
function getReportStatsInfo(reportedItems) {
  let stats = {
    'dangerous-shell-commands': 0,
    'has-os-scripts': 0,
    'install-scripts': 0,
    'lockfile-is-not-safe': 0,
    'no-source-code': 0,
    'obfuscated-code': 0,
    'package-is-too-new': 0,
    'released-after-long-period-of-inactivity': 0,
    'too-many-decision-makers': 0,
    'unmaintained-package': 0
  }

  reportedItems.forEach(({ metric }) => {
    stats[metric] += 1
  })

  return Object.entries(stats)
    .filter(([, v]) => v !== 0)
    .map(item => `${item[0]}: ${item[1]}`)
    .join('\n')
}

/**
 * @typedef {import('./cli').printErrorsInfo} printErrorsInfo
 * @type printErrorsInfo
 */
function printErrorsInfo(reportedItems, cliOptions) {
  if (reportedItems.length > 0) {
    console.error(pc.red(`Errors: ${reportedItems.length}`))
    console.error(
      pc.red(
        cliOptions.short
          ? getReportStatsInfo(reportedItems)
          : JSON.stringify(reportedItems, null, 2)
      )
    )
  } else {
    console.log(pc.green('Errors: 0'))
  }
}

/**
 * @typedef {import('./cli').printWarningsInfo} printWarningsInfo
 * @type printWarningsInfo
 */
function printWarningsInfo(reportedItems, cliOptions) {
  if (reportedItems.length > 0) {
    console.warn(pc.yellow(`\nWarnings: ${reportedItems.length}`))
    console.warn(
      pc.yellow(
        cliOptions.full ? JSON.stringify(reportedItems, null, 2) : getReportStatsInfo(reportedItems)
      )
    )
  } else {
    console.log(pc.green('\nWarnings: 0'))
  }
}
