import { useState } from 'react'
import type { PiperConnectionStatus } from '../features/audio/piperTypes.ts'

const SETUP_COMMANDS = [
  'py -m pip install "piper-tts[http]"',
  'py -m piper.download_voices en_US-lessac-medium',
  'py -m piper.http_server -m en_US-lessac-medium --host 127.0.0.1 --port 5000',
] as const

function SetupCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1_500)
    } catch (error) {
      console.warn('Could not copy the Piper command.', error)
    }
  }

  return (
    <div className="setup-command">
      <code>{command}</code>
      <button type="button" onClick={() => void handleCopy()} aria-label={`Copy command: ${command}`}>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

interface AudioSettingsProps {
  includeAudio: boolean
  status: PiperConnectionStatus
  message: string | null
  voices: string[]
  selectedVoice: string
  isRefreshing: boolean
  isImporting: boolean
  onIncludeAudioChange: (include: boolean) => void
  onVoiceChange: (voice: string) => void
  onRefresh: () => void
}

export function AudioSettings({
  includeAudio,
  status,
  message,
  voices,
  selectedVoice,
  isRefreshing,
  isImporting,
  onIncludeAudioChange,
  onVoiceChange,
  onRefresh,
}: AudioSettingsProps) {
  const statusLabel = status === 'connected'
    ? 'Piper connected'
    : status === 'checking'
      ? 'Checking Piper…'
      : 'Piper not connected'

  return (
    <div className={`audio-settings ${includeAudio ? 'audio-settings--enabled' : ''}`}>
      <div className="audio-settings-heading">
        <label className="audio-toggle">
          <input
            type="checkbox"
            checked={includeAudio}
            onChange={(event) => onIncludeAudioChange(event.target.checked)}
            disabled={isImporting}
          />
          <span>
            <strong>Include pronunciation audio</strong>
            <small>Generate a local WAV for each Front with Piper.</small>
          </span>
        </label>
        <span className={`connection-pill connection-pill--${status}`} role="status">
          <span className="status-dot" aria-hidden="true" />
          {statusLabel}
        </span>
      </div>

      {includeAudio && (
        <div className="audio-settings-body">
          {status === 'connected' ? (
            <div className="voice-controls">
              <div className="deck-field">
                <label htmlFor="piper-voice">Piper voice for this batch</label>
                <select
                  id="piper-voice"
                  value={selectedVoice}
                  onChange={(event) => onVoiceChange(event.target.value)}
                  disabled={isRefreshing || isImporting}
                >
                  {voices.map((voice) => <option value={voice} key={voice}>{voice}</option>)}
                </select>
              </div>
              <button
                className="button button--secondary"
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing || isImporting}
              >
                {isRefreshing ? <span className="spinner spinner--dark" aria-hidden="true" /> : <span aria-hidden="true">↻</span>}
                Reload voices
              </button>
            </div>
          ) : (
            <div className="piper-setup">
              {message && <p role="alert">{message}</p>}
              <p>Run these commands in PowerShell, then retry the connection:</p>
              <div className="setup-commands">
                {SETUP_COMMANDS.map((command) => <SetupCommand command={command} key={command} />)}
              </div>
              <button
                className="button button--secondary"
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing || isImporting}
              >
                {isRefreshing ? <span className="spinner spinner--dark" aria-hidden="true" /> : null}
                {isRefreshing ? 'Checking…' : 'Retry Piper connection'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
