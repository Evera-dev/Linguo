import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process'
import { once } from 'node:events'
import type { Logger } from './output.js'
import { CliError } from '../types.js'

export const delay = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))

export const spawnAndConfirm = async (
  command: string,
  args: string[],
  options: SpawnOptions,
): Promise<ChildProcess> => {
  const child = spawn(command, args, options)

  try {
    await Promise.race([
      once(child, 'spawn'),
      once(child, 'error').then(([error]) => Promise.reject(error)),
    ])
  } catch (error) {
    throw new CliError(`Could not start command "${command}".`, 'Verify that it is installed and available in PATH.', {
      cause: error,
    })
  }

  return child
}

const waitForExit = async (child: ChildProcess, timeoutMs: number): Promise<boolean> => {
  if (child.exitCode !== null || child.signalCode !== null) return true

  return Promise.race([
    once(child, 'exit').then(() => true),
    delay(timeoutMs).then(() => false),
  ])
}

const runTaskkill = async (pid: number, force: boolean): Promise<void> => {
  const args = ['/PID', String(pid), '/T', ...(force ? ['/F'] : [])]
  const taskkill = spawn('taskkill.exe', args, { stdio: 'ignore', windowsHide: true })
  await once(taskkill, 'exit')
}

export const stopProcessTree = async (child: ChildProcess, logger: Logger): Promise<void> => {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return
  logger.debug(`Stopping process tree ${child.pid}.`)

  if (process.platform === 'win32') {
    await runTaskkill(child.pid, false)
    if (!(await waitForExit(child, 1_500))) await runTaskkill(child.pid, true)
    return
  }

  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch {
    child.kill('SIGTERM')
  }
  if (await waitForExit(child, 3_000)) return

  try {
    process.kill(-child.pid, 'SIGKILL')
  } catch {
    child.kill('SIGKILL')
  }
}

interface ManagedProcess {
  child: ChildProcess
  name: string
}

export class ProcessRegistry {
  private readonly processes: ManagedProcess[] = []
  private stopping = false

  add(name: string, child: ChildProcess): void {
    this.processes.push({ child, name })
  }

  async stopAll(logger: Logger): Promise<void> {
    if (this.stopping) return
    this.stopping = true

    for (const processEntry of [...this.processes].reverse()) {
      logger.debug(`Cleaning up ${processEntry.name}.`)
      await stopProcessTree(processEntry.child, logger)
    }
  }
}

export const waitForChildExit = async (child: ChildProcess): Promise<number> => {
  if (child.exitCode !== null) return child.exitCode
  const [code] = await once(child, 'exit')
  return typeof code === 'number' ? code : 0
}
