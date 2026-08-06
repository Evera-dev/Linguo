import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawn } from 'node:child_process'
import type { AnkiCliConfig } from '../types.js'
import { CliError } from '../types.js'
import type { Logger } from './output.js'
import { delay, spawnAndConfirm } from './processes.js'

const runAndCapture = async (command: string, args: string[]): Promise<{ code: number; output: string }> => {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true })
    let output = ''
    let settled = false
    const finish = (code: number) => {
      if (settled) return
      settled = true
      resolve({ code, output })
    }

    child.stdout?.setEncoding('utf8')
    child.stdout?.on('data', (chunk: string) => {
      output += chunk
    })
    child.once('error', () => finish(1))
    child.once('exit', (code) => finish(typeof code === 'number' ? code : 1))
  })
}

const isAnkiProcessRunning = async (): Promise<boolean> => {
  if (process.platform === 'win32') {
    const result = await runAndCapture('tasklist.exe', ['/FI', 'IMAGENAME eq anki.exe', '/FO', 'CSV', '/NH'])
    return result.code === 0 && result.output.toLowerCase().includes('anki.exe')
  }

  const result = await runAndCapture('pgrep', ['-x', 'anki'])
  return result.code === 0
}

const findOnPath = async (): Promise<string | null> => {
  const command = process.platform === 'win32' ? 'where.exe' : 'which'
  const result = await runAndCapture(command, [process.platform === 'win32' ? 'anki.exe' : 'anki'])
  if (result.code !== 0) return null
  return result.output.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? null
}

const commonAnkiPaths = (): string[] => {
  if (process.platform === 'win32') {
    const paths = [
      process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Programs', 'Anki', 'anki.exe'),
      process.env.ProgramFiles && join(process.env.ProgramFiles, 'Anki', 'anki.exe'),
      process.env['ProgramFiles(x86)'] && join(process.env['ProgramFiles(x86)'], 'Anki', 'anki.exe'),
      process.env.USERPROFILE && join(process.env.USERPROFILE, 'scoop', 'apps', 'anki', 'current', 'anki.exe'),
      'C:\\ProgramData\\chocolatey\\bin\\anki.exe',
    ]
    return paths.filter((path): path is string => Boolean(path))
  }

  if (process.platform === 'darwin') return ['/Applications/Anki.app/Contents/MacOS/anki']
  return ['/usr/bin/anki', '/usr/local/bin/anki']
}

const findAnkiExecutable = async (configuredPath: string | undefined): Promise<string | null> => {
  const environmentPath = process.env.LINGUO_ANKI_PATH
  for (const candidate of [configuredPath, environmentPath, await findOnPath(), ...commonAnkiPaths()]) {
    if (candidate && existsSync(candidate)) return candidate
  }
  return null
}

const isAnkiConnectReady = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'version', version: 6 }),
      signal: AbortSignal.timeout(2_000),
    })
    if (!response.ok) return false
    const payload: unknown = await response.json()
    if (payload === null || typeof payload !== 'object') return false
    return 'result' in payload && typeof payload.result === 'number' &&
      'error' in payload && payload.error === null
  } catch {
    return false
  }
}

const waitForAnkiConnect = async (config: AnkiCliConfig): Promise<void> => {
  const deadline = Date.now() + config.startupTimeoutMs
  while (Date.now() < deadline) {
    if (await isAnkiConnectReady(config.connectUrl)) return
    await delay(500)
  }

  throw new CliError(
    'Anki started, but AnkiConnect did not respond in time.',
    'Make sure AnkiConnect is installed and enabled, then run linguo again.',
  )
}

export const ensureAnkiRunning = async (config: AnkiCliConfig, logger: Logger): Promise<void> => {
  if (await isAnkiConnectReady(config.connectUrl)) return

  const alreadyRunning = await isAnkiProcessRunning()
  if (!alreadyRunning) {
    const executablePath = await findAnkiExecutable(config.executablePath)
    if (!executablePath) {
      throw new CliError(
        'Anki could not be found.',
        'Install Anki, add it to PATH, set LINGUO_ANKI_PATH, or configure anki.executablePath.',
      )
    }

    logger.debug(`Starting Anki from ${executablePath}.`)
    const anki = await spawnAndConfirm(executablePath, [], {
      cwd: dirname(executablePath),
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    })
    anki.unref()
  } else {
    logger.debug('Anki process is already running; waiting for AnkiConnect.')
  }

  await waitForAnkiConnect(config)
}
