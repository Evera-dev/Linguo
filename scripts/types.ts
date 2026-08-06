export interface AnkiCliConfig {
  connectUrl: string
  startupTimeoutMs: number
  executablePath?: string
}
export interface PiperCliConfig {
  infoUrl: string
  command: string
  args: string[]
  startupTimeoutMs: number
}

export interface DevServerCliConfig {
  startupTimeoutMs: number
}

export interface LinguoCliConfig {
  anki: AnkiCliConfig
  piper: PiperCliConfig
  devServer: DevServerCliConfig
}

export interface PackageManifest {
  name?: string
  scripts: Record<string, string>
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
}

export class CliError extends Error {
  readonly hint?: string

  constructor(message: string, hint?: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'CliError'
    this.hint = hint
  }
}
