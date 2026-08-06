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
  const note = attachAudioToAnkiNote(
    cardToAnkiNote(card, 'Default'),
    { filename: 'linguo-example.wav', data: 'UklGRg==' },
  )

  if (note.audio?.filename !== 'linguo-example.wav') failures.push('audio filename was not attached')
  if (note.audio?.data !== 'UklGRg==') failures.push('base64 audio was not attached')
  if (note.audio?.fields[0] !== 'Back') failures.push('audio was not mapped to Back')
  if (note.fields.Front !== '&lt;Practice this&gt;') failures.push('Front HTML escaping changed')
  if (note.fields.Back !== '<div>Practica esto</div>') failures.push('Back content changed')

  return failures
}
