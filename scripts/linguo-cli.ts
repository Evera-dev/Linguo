#!/usr/bin/env node

import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureAnkiRunning } from './services/anki.js'
import { openBrowser } from './services/browser.js'
import { findProjectRoot, loadCliConfig, loadPackageManifest } from './services/config.js'
import { startDevServer } from './services/devServer.js'
import { createLogger } from './services/output.js'
import { ensurePiperRunning } from './services/piper.js'
import { ProcessRegistry, waitForChildExit } from './services/processes.js'
import { CliError } from './types.js'

const HELP_TEXT = `Linguo development CLI

Usage:
  linguo [--debug]

Options:
  --debug    Show child-process output and technical error details
  --help     Show this help message
`

const run = async (): Promise<void> => {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log(HELP_TEXT)
    return
  }

  const unknownArgument = args.find((argument) => argument !== '--debug')
  if (unknownArgument) throw new CliError(`Unknown option: ${unknownArgument}`, 'Run linguo --help for usage information.')

  const debugEnabled = args.includes('--debug') || process.env.LINGUO_DEBUG === '1'
  const logger = createLogger(debugEnabled)
  const processRegistry = new ProcessRegistry()
  const moduleDirectory = dirname(fileURLToPath(import.meta.url))
  const projectRoot = findProjectRoot(moduleDirectory)
  const config = loadCliConfig(projectRoot)
  const manifest = loadPackageManifest(projectRoot)
  let signalHandled = false

  const handleSignal = () => {
    if (signalHandled) return
    signalHandled = true
    logger.info('\nStopping Linguo...')
    void processRegistry.stopAll(logger).then(() => process.exit(130))
  }

  process.once('SIGINT', handleSignal)
  process.once('SIGTERM', handleSignal)

  logger.info('\n Starting Linguo...\n')

  try {
    logger.step('Checking Anki...')
    await ensureAnkiRunning(config.anki, logger)
    logger.success('Anki running')

    logger.step('Checking Piper...')
    await ensurePiperRunning(
      config.piper,
      projectRoot,
      logger,
      (child) => processRegistry.add('Piper', child),
    )
    logger.success('Piper running')

    logger.step('Starting development server...')
    const devServer = await startDevServer(
      projectRoot,
      manifest,
      config.devServer,
      logger,
      (child) => processRegistry.add('development server', child),
    )
    logger.success('Dev server running')

    logger.step('Opening browser...')
    await openBrowser(devServer.url)
    logger.success('Browser opened')

    logger.info(`\nLinguo is ready.\n\n${devServer.url}\n`)
    const exitCode = await waitForChildExit(devServer.child)
    await processRegistry.stopAll(logger)
    if (!signalHandled && exitCode !== 0) {
      throw new CliError(`The development server stopped with exit code ${exitCode}.`)
    }
  } catch (error) {
    await processRegistry.stopAll(logger)
    if (error instanceof CliError) {
      logger.error(error.message)
      if (error.hint) logger.info(`\n${error.hint}`)
    } else {
      logger.error('Linguo could not start the development environment.')
    }
    if (debugEnabled) console.error('\n', error)
    process.exitCode = 1
  } finally {
    process.removeListener('SIGINT', handleSignal)
    process.removeListener('SIGTERM', handleSignal)
  }
}

void run().catch((error: unknown) => {
  const debugEnabled = process.argv.includes('--debug') || process.env.LINGUO_DEBUG === '1'
  const logger = createLogger(debugEnabled)
  if (error instanceof CliError) {
    logger.error(error.message)
    if (error.hint) logger.info(`\n${error.hint}`)
  } else {
    logger.error('Linguo could not initialize its development CLI.')
  }
  if (debugEnabled) console.error('\n', error)
  process.exitCode = 1
})
