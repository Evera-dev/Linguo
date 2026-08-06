import { spawnAndConfirm } from './processes.js'
import { CliError } from '../types.js'

const validateLocalUrl = (value: string): URL => {
  let url: URL
  try {
    url = new URL(value)
  } catch (error) {
    throw new CliError(`The development server reported an invalid URL: ${value}`, undefined, { cause: error })
  }

  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new CliError(`Refusing to open a non-local development URL: ${value}`)
  }
  return url
}

export const openBrowser = async (value: string): Promise<void> => {
  const url = validateLocalUrl(value).toString()
  const command = process.platform === 'win32'
    ? { executable: 'cmd.exe', args: ['/c', 'start', '', url] }
    : process.platform === 'darwin'
      ? { executable: 'open', args: [url] }
      : { executable: 'xdg-open', args: [url] }

  const browser = await spawnAndConfirm(command.executable, command.args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  })
  browser.unref()
}
