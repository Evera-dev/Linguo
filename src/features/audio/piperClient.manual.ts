import { arrayBufferToBase64, createAudioFilename } from './piperClient.ts'

export const runPiperManualExamples = async (): Promise<string[]> => {
  const failures: string[] = []
  const firstName = await createAudioFilename('Hello there.', 'en_US-lessac-medium')
  const repeatedName = await createAudioFilename('Hello there.', 'en_US-lessac-medium')
  const otherVoiceName = await createAudioFilename('Hello there.', 'en_GB-alan-medium')

  if (firstName !== repeatedName) failures.push('filename is not deterministic')
  if (firstName === otherVoiceName) failures.push('voice is not included in filename identity')
  if (!/^linguo-en-us-lessac-medium-[a-f0-9]{16}\.wav$/.test(firstName)) {
    failures.push('filename format is invalid')
  }

  const bytes = new Uint8Array([72, 101, 108, 108, 111]).buffer
  if (arrayBufferToBase64(bytes) !== 'SGVsbG8=') failures.push('base64 encoding is invalid')

  return failures
}
