import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, parse } from 'node:path'
import type { LinguoCliConfig, PackageManifest } from '../types.js'
import { CliError } from '../types.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const readJson = (path: string): unknown => {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as unknown
  } catch (error) {
    throw new CliError(`Could not read ${path}.`, 'Check that the file contains valid JSON.', { cause: error })
  }
}
const requireRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!isRecord(value)) throw new CliError(`${label} must be an object in linguo.config.json.`)
  return value
}

const requireString = (record: Record<string, unknown>, key: string, label: string): string => {
  const value = record[key]
  if (typeof value !== 'string' || !value.trim()) {
    throw new CliError(`${label}.${key} must be a non-empty string in linguo.config.json.`)
  }
  return value
}

const requirePositiveNumber = (record: Record<string, unknown>, key: string, label: string): number => {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new CliError(`${label}.${key} must be a positive number in linguo.config.json.`)
  }
  return value
}

const requireStringArray = (record: Record<string, unknown>, key: string, label: string): string[] => {
  const value = record[key]
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new CliError(`${label}.${key} must be an array of strings in linguo.config.json.`)
  }
  return value
}

export const findProjectRoot = (startPath: string): string => {
  let currentPath = startPath

  while (true) {
    const packagePath = join(currentPath, 'package.json')
    if (existsSync(packagePath)) {
      const packageValue = readJson(packagePath)
      if (isRecord(packageValue) && packageValue.name === 'linguo') return currentPath
    }

    const parentPath = dirname(currentPath)
    if (parentPath === currentPath || parse(currentPath).root === currentPath) break
    currentPath = parentPath
  }

  throw new CliError('Could not locate the Linguo project directory.')
}

export const loadCliConfig = (projectRoot: string): LinguoCliConfig => {
  const configPath = join(projectRoot, 'linguo.config.json')
  if (!existsSync(configPath)) {
    throw new CliError('linguo.config.json was not found.', `Expected it at ${configPath}`)
  }

  const root = requireRecord(readJson(configPath), 'Configuration')
  const anki = requireRecord(root.anki, 'anki')
  const piper = requireRecord(root.piper, 'piper')
  const devServer = requireRecord(root.devServer, 'devServer')
  const executablePath = anki.executablePath

  if (executablePath !== undefined && typeof executablePath !== 'string') {
    throw new CliError('anki.executablePath must be a string when provided.')
  }

  return {
    anki: {
      connectUrl: requireString(anki, 'connectUrl', 'anki'),
      startupTimeoutMs: requirePositiveNumber(anki, 'startupTimeoutMs', 'anki'),
      ...(executablePath ? { executablePath } : {}),
    },
    piper: {
      infoUrl: requireString(piper, 'infoUrl', 'piper'),
      command: requireString(piper, 'command', 'piper'),
      args: requireStringArray(piper, 'args', 'piper'),
      startupTimeoutMs: requirePositiveNumber(piper, 'startupTimeoutMs', 'piper'),
    },
    devServer: {
      startupTimeoutMs: requirePositiveNumber(devServer, 'startupTimeoutMs', 'devServer'),
    },
  }
}

const toStringRecord = (value: unknown): Record<string, string> => {
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )
}

export const loadPackageManifest = (projectRoot: string): PackageManifest => {
  const value = readJson(join(projectRoot, 'package.json'))
  if (!isRecord(value)) throw new CliError('package.json must contain an object.')

  return {
    ...(typeof value.name === 'string' ? { name: value.name } : {}),
    scripts: toStringRecord(value.scripts),
    dependencies: toStringRecord(value.dependencies),
    devDependencies: toStringRecord(value.devDependencies),
  }
}
