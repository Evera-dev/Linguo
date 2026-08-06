import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import type { ChildProcess } from 'node:child_process'
import type { DevServerCliConfig, PackageManifest } from '../types.js'
import { CliError } from '../types.js'
import type { Logger } from './output.js'
import { spawnAndConfirm } from './processes.js'

export type ProjectTool = 'vite' | 'next' | 'other'
export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun'

interface DevServerCommand {
  command: string
  args: string[]
  packageManager: PackageManager
  script: string
  tool: ProjectTool
}

export interface RunningDevServer {
  child: ChildProcess
  url: string
}

const ANSI_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, 'g')
const LOCAL_URL_PATTERN = /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/[^\s]*)?/i

export const extractLocalUrl = (line: string): string | null => {
  const match = line.replace(ANSI_PATTERN, '').match(LOCAL_URL_PATTERN)
  if (!match) return null
  const candidate = match[0].replace(/[),.;]+$/, '')

  try {
    return new URL(candidate).toString()
  } catch {
    return null
  }
}

export const detectProjectTool = (manifest: PackageManifest): ProjectTool => {
  const packages = { ...manifest.dependencies, ...manifest.devDependencies }
  if ('vite' in packages || Object.values(manifest.scripts).some((script) => /(?:^|\s)vite(?:\s|$)/.test(script))) {
    return 'vite'
  }
  if ('next' in packages || Object.values(manifest.scripts).some((script) => /(?:^|\s)next(?:\s|$)/.test(script))) {
    return 'next'
  }
  return 'other'
}

export const detectPackageManager = (projectRoot: string): PackageManager => {
  if (existsSync(join(projectRoot, 'pnpm-lock.yaml'))) return 'pnpm'
  if (existsSync(join(projectRoot, 'yarn.lock'))) return 'yarn'
  if (existsSync(join(projectRoot, 'bun.lock')) || existsSync(join(projectRoot, 'bun.lockb'))) return 'bun'
  return 'npm'
}

export const selectDevScript = (manifest: PackageManifest): string => {
  for (const candidate of ['dev', 'start:dev', 'serve', 'start']) {
    if (candidate in manifest.scripts) return candidate
  }
  throw new CliError('No development server script was found in package.json.', 'Add a dev, start:dev, serve, or start script.')
}

export const createDevServerCommand = (
  projectRoot: string,
  manifest: PackageManifest,
): DevServerCommand => {
  const packageManager = detectPackageManager(projectRoot)
  const script = selectDevScript(manifest)
  const command = process.platform === 'win32'
    ? process.env.ComSpec || 'cmd.exe'
    : packageManager
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', `${packageManager} run ${script}`]
    : ['run', script]
  return {
    command,
    args,
    packageManager,
    script,
    tool: detectProjectTool(manifest),
  }
}

const waitForServerUrl = (
  child: ChildProcess,
  timeoutMs: number,
  logger: Logger,
): Promise<string> => new Promise((resolve, reject) => {
  let settled = false
  const finish = (error: Error | null, url?: string) => {
    if (settled) return
    settled = true
    clearTimeout(timeout)
    child.off('exit', handleExit)
    if (error) reject(error)
    else if (url) resolve(url)
  }
  const handleLine = (line: string) => {
    logger.debug(`[Dev server] ${line}`)
    const url = extractLocalUrl(line)
    if (url) finish(null, url)
  }
  const handleExit = (code: number | null) => {
    finish(new CliError(`The development server exited before it was ready (code ${code ?? 'unknown'}).`))
  }
  const timeout = setTimeout(() => {
    finish(new CliError('The development server did not report a local URL in time.', 'Run the package dev script directly with --debug to inspect its output.'))
  }, timeoutMs)

  if (child.stdout) createInterface({ input: child.stdout }).on('line', handleLine)
  if (child.stderr) createInterface({ input: child.stderr }).on('line', handleLine)
  child.once('exit', handleExit)
  if (child.exitCode !== null) handleExit(child.exitCode)
})

export const startDevServer = async (
  projectRoot: string,
  manifest: PackageManifest,
  config: DevServerCliConfig,
  logger: Logger,
  onStarted: (child: ChildProcess) => void,
): Promise<RunningDevServer> => {
  const devCommand = createDevServerCommand(projectRoot, manifest)
  logger.debug(`Detected ${devCommand.tool} with ${devCommand.packageManager} script "${devCommand.script}".`)

  const child = await spawnAndConfirm(devCommand.command, devCommand.args, {
    cwd: projectRoot,
    detached: process.platform !== 'win32',
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: false,
  })
  onStarted(child)
  const url = await waitForServerUrl(child, config.startupTimeoutMs, logger)
  return { child, url }
}
