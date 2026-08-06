import {
  detectProjectTool,
  extractLocalUrl,
  selectDevScript,
} from './services/devServer.js'
import type { PackageManifest } from './types.js'

const manifest = (
  scripts: Record<string, string>,
  devDependencies: Record<string, string> = {},
): PackageManifest => ({
  scripts,
  dependencies: {},
  devDependencies,
})

export const runCliManualExamples = (): string[] => {
  const failures: string[] = []

  if (detectProjectTool(manifest({ dev: 'vite' }, { vite: '^8' })) !== 'vite') {
    failures.push('Vite detection failed')
  }
  if (detectProjectTool(manifest({ dev: 'next dev' }, { next: '^16' })) !== 'next') {
    failures.push('Next detection failed')
  }
  if (selectDevScript(manifest({ start: 'node server.js', dev: 'vite' })) !== 'dev') {
    failures.push('development script precedence failed')
  }

  const coloredOutput = `${String.fromCharCode(27)}[32mLocal: http://localhost:5184/${String.fromCharCode(27)}[0m`
  if (extractLocalUrl(coloredOutput) !== 'http://localhost:5184/') {
    failures.push('dynamic local URL extraction failed')
  }
  if (extractLocalUrl('Ready on https://127.0.0.1:3001/path') !== 'https://127.0.0.1:3001/path') {
    failures.push('HTTPS local URL extraction failed')
  }
  if (extractLocalUrl('Remote: https://example.com') !== null) {
    failures.push('non-local URL rejection failed')
  }

  return failures
}
