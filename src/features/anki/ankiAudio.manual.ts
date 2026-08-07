import { attachAudioToAnkiNote, cardToAnkiNote } from './ankiClient.ts'
import type { ParsedCard } from '../cards/cardTypes.ts'

export const runAnkiAudioManualExamples = (): string[] => {
  const failures: string[] = []
  const card: ParsedCard = {
    id: 'card-1',
    front: '<Practice this>',
    back: 'Practica esto',
    tags: ['audio'],
    errors: [],
    warnings: [],
  }
  const backNote = attachAudioToAnkiNote(
    cardToAnkiNote(card, 'Default'),
    { filename: 'linguo-example.wav', data: 'UklGRg==' },
  )
  const frontNote = attachAudioToAnkiNote(
    cardToAnkiNote(card, 'Default'),
    { filename: 'linguo-front.wav', data: 'UklGRg==' },
    'Front',
  )

  if (backNote.audio?.filename !== 'linguo-example.wav') failures.push('audio filename was not attached')
  if (backNote.audio?.data !== 'UklGRg==') failures.push('base64 audio was not attached')
  if (backNote.audio?.fields[0] !== 'Back') failures.push('audio was not mapped to Back')
  if (frontNote.audio?.fields[0] !== 'Front') failures.push('audio was not mapped to Front')
  if (backNote.fields.Front !== '&lt;Practice this&gt;') failures.push('Front HTML escaping changed')
  if (backNote.fields.Back !== '<div>Practica esto</div>') failures.push('Back content changed')

  return failures
}
