import type { ConnectionStatus } from '../hooks/useAnkiConnection.ts'

interface AppHeaderProps {
  message: string
  connectionStatus: ConnectionStatus
  isDarkMode: boolean
  onToggleTheme: () => void
}

const connectionLabels: Record<ConnectionStatus, string> = {
  checking: 'Connecting to Anki…',
  connected: 'Anki connected',
  disconnected: 'Anki disconnected',
}

export function AppHeader({ message, connectionStatus, isDarkMode, onToggleTheme }: AppHeaderProps) {
  return (
    <header className="app-header">
      <a className="brand" href="#main-content" aria-label="Linguo home">
        <span className="brand-mark" aria-hidden="true">L</span>
        <span>Linguo</span>
      </a>

      <div className="header-actions">
        <div className="mascot-message" role="status" aria-live="polite">
          <span className="robot" aria-hidden="true">🤖</span>
          <div>
            <p>{message}</p>
            <span className={`connection-label connection-label--${connectionStatus}`}>
              <span className="status-dot" aria-hidden="true" />
              {connectionLabels[connectionStatus]}
            </span>
          </div>
        </div>
        <button
          className="theme-toggle"
          type="button"
          onClick={onToggleTheme}
          aria-label={isDarkMode ? 'Use light theme' : 'Use dark theme'}
          aria-pressed={isDarkMode}
          title={isDarkMode ? 'Use light theme' : 'Use dark theme'}
        >
          <span aria-hidden="true">{isDarkMode ? '☀' : '☾'}</span>
        </button>
      </div>
    </header>
  )
}
