import type { ParsedCard } from './cardTypes.ts'

const SUPPORTED_FIELDS = ['front', 'back', 'example', 'notes', 'tags'] as const

type SupportedField = (typeof SUPPORTED_FIELDS)[number]
type CardValues = Record<SupportedField, string>

const isSupportedField = (field: string): field is SupportedField =>
  SUPPORTED_FIELDS.some((supportedField) => supportedField === field)

const splitIntoBlocks = (input: string): string[][] => {
  const blocks: string[][] = [[]]

  for (const line of input.replaceAll('\r\n', '\n').split('\n')) {
    if (line.trim() === '---') {
      blocks.push([])
      continue
    }

    blocks.at(-1)?.push(line)
  }

  return blocks.filter((block) => block.some((line) => line.trim().length > 0))
}

const createEmptyValues = (): CardValues => ({
  front: '',
  back: '',
  example: '',
  notes: '',
  tags: '',
})

const parseBlock = (lines: string[], cardNumber: number): ParsedCard => {
  const values = createEmptyValues()
  const warnings: string[] = []
  let activeField: SupportedField | null = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    const separatorIndex = line.indexOf(':')
    if (separatorIndex === -1) {
      if (activeField) {
        values[activeField] = `${values[activeField]}\n${line}`.trim()
      } else {
        warnings.push(`Card ${cardNumber} contains text that is not assigned to a field.`)
      }
      continue
    }

    const rawField = line.slice(0, separatorIndex).trim()
    const normalizedField = rawField.toLowerCase()
    const value = line.slice(separatorIndex + 1).trim()

    if (!isSupportedField(normalizedField)) {
      warnings.push(`Card ${cardNumber} contains the unknown field “${rawField}”.`)
      activeField = null
      continue
    }

    if (values[normalizedField]) {
      warnings.push(`Card ${cardNumber} repeats the ${rawField} field; its values were combined.`)
      values[normalizedField] = `${values[normalizedField]}\n${value}`.trim()
    } else {
      values[normalizedField] = value
    }
    activeField = normalizedField
  }

  const errors: string[] = []
  if (!values.front) errors.push(`Card ${cardNumber} is missing its Front field.`)
  if (!values.back) errors.push(`Card ${cardNumber} is missing its Back field.`)

  return {
    id: `card-${cardNumber}`,
    front: values.front,
    back: values.back,
    ...(values.example ? { example: values.example } : {}),
    ...(values.notes ? { notes: values.notes } : {}),
    tags: values.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    errors,
    warnings,
  }
}

export const parseCards = (input: string): ParsedCard[] =>
  splitIntoBlocks(input).map((block, index) => parseBlock(block, index + 1))

