import type { ChildProcess } from 'node:child_process'
import type { PiperCliConfig } from '../types.js'
import { CliError } from '../types.js'
import type { Logger } from './output.js'
import { delay, spawnAndConfirm } from './processes.js'

const isPiperReady = async (infoUrl: string): Promise<boolean> => {
  try {
    const response = await fetch(infoUrl, { signal: AbortSignal.timeout(2_000) })
    if (!response.ok) return false
    const payload: unknown = await response.json()
    if (payload === null || typeof payload !== 'object' || !('voice' in payload)) return false
    return payload.voice !== null && typeof payload.voice === 'object'
  } catch {
    return false
  }
}

export const formatPiperCommand = (config: PiperCliConfig): string =>
  [config.command, ...config.args.map((arg) => arg.includes(' ') ? `"${arg}"` : arg)].join(' ')

const waitForPiper = async (config: PiperCliConfig, child: ChildProcess): Promise<void> => {
  const deadline = Date.now() + config.startupTimeoutMs
  while (Date.now() < deadline) {
    if (await isPiperReady(config.infoUrl)) return
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new CliError('Piper exited before its HTTP server became ready.', `Run:\n${formatPiperCommand(config)}`)
    }
    await delay(500)
  }

  throw new CliError('Piper could not be started before the timeout.', `Run:\n${formatPiperCommand(config)}`)
}

export const ensurePiperRunning = async (
  config: PiperCliConfig,
  projectRoot: string,
  logger: Logger,
  onStarted: (child: ChildProcess) => void,
): Promise<ChildProcess | null> => {
  if (await isPiperReady(config.infoUrl)) return null

  let child: ChildProcess
  try {
    child = await spawnAndConfirm(config.command, config.args, {
      cwd: projectRoot,
      detached: process.platform !== 'win32',
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: false,
    })
  } catch (error) {
    throw new CliError(
      'Piper could not be started.',
      `Run:\n${formatPiperCommand(config)}\n\nUpdate linguo.config.json if your command is different.`,
      { cause: error },
    )
  }

  child.stdout?.setEncoding('utf8')
  child.stderr?.setEncoding('utf8')
  child.stdout?.on('data', (chunk: string) => logger.debug(`[Piper] ${chunk.trim()}`))
  child.stderr?.on('data', (chunk: string) => logger.debug(`[Piper] ${chunk.trim()}`))
  onStarted(child)
  await waitForPiper(config, child)
  return child
}
