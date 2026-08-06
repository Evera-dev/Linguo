import { useCallback, useEffect, useState } from 'react'
import { getPiperErrorMessage, getPiperInfo, getPiperVoices } from '../features/audio/piperClient.ts'
import type { PiperConnectionStatus } from '../features/audio/piperTypes.ts'

interface PiperConnectionState {
  status: PiperConnectionStatus
  voices: string[]
  defaultVoice: string
  message: string | null
  isRefreshing: boolean
}

const loadPiperState = async (): Promise<PiperConnectionState> => {
  try {
    const info = await getPiperInfo()
    const availableVoices = await getPiperVoices()
    const voices = availableVoices.includes(info.name)
      ? availableVoices
      : [info.name, ...availableVoices]

    return {
      status: 'connected',
      voices,
      defaultVoice: info.name,
      message: null,
      isRefreshing: false,
    }
  } catch (error) {
    return {
      status: 'disconnected',
      voices: [],
      defaultVoice: '',
      message: getPiperErrorMessage(error),
      isRefreshing: false,
    }
  }
}

export function usePiperConnection() {
  const [state, setState] = useState<PiperConnectionState>({
    status: 'checking',
    voices: [],
    defaultVoice: '',
    message: null,
    isRefreshing: true,
  })

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, status: 'checking', message: null, isRefreshing: true }))
    setState(await loadPiperState())
  }, [])

  useEffect(() => {
    let isCurrent = true
    void loadPiperState().then((nextState) => {
      if (isCurrent) setState(nextState)
    })
    return () => {
      isCurrent = false
    }
  }, [])

  return { ...state, refresh }
}

