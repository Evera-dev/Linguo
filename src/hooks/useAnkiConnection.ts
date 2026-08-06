import { useCallback, useEffect, useState } from 'react'
import { checkAnkiConnection, getAnkiErrorMessage, getDeckNames } from '../features/anki/ankiClient.ts'

export type ConnectionStatus = 'checking' | 'connected' | 'disconnected'

interface AnkiConnectionState {
  status: ConnectionStatus
  decks: string[]
  message: string | null
  isRefreshing: boolean
}

const loadAnkiState = async (): Promise<AnkiConnectionState> => {
  try {
    await checkAnkiConnection()
    const decks = await getDeckNames()
    return { status: 'connected', decks, message: null, isRefreshing: false }
  } catch (error) {
    return {
      status: 'disconnected',
      decks: [],
      message: getAnkiErrorMessage(error),
      isRefreshing: false,
    }
  }
}

export function useAnkiConnection() {
  const [state, setState] = useState<AnkiConnectionState>({
    status: 'checking',
    decks: [],
    message: null,
    isRefreshing: true,
  })

  const refresh = useCallback(async () => {
    setState((current) => ({
      ...current,
      status: current.status === 'connected' ? 'connected' : 'checking',
      message: null,
      isRefreshing: true,
    }))

    setState(await loadAnkiState())
  }, [])

  useEffect(() => {
    let isCurrent = true
    void loadAnkiState().then((nextState) => {
      if (isCurrent) setState(nextState)
    })
    return () => {
      isCurrent = false
    }
  }, [])

  return { ...state, refresh }
}
