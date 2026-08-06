import { parseCards } from './cardParser.ts'

interface ParserExample {
  name: string
  input: string
  verify: (cards: ReturnType<typeof parseCards>) => boolean
}

export const parserManualExamples: ParserExample[] = [
  {
    name: 'one valid card',
    input: 'Front: Hello\nBack: Hola',
    verify: ([card]) => card?.front === 'Hello' && card.back === 'Hola' && card.errors.length === 0,
  },
  {
    name: 'multiple cards',
    input: 'Front: One\nBack: Uno\n---\nFront: Two\nBack: Dos',
    verify: (cards) => cards.length === 2,
  },
  {
    name: 'missing Front',
    input: 'Back: Translation',
    verify: ([card]) => card?.errors[0] === 'Card 1 is missing its Front field.',
  },
  {
    name: 'missing Back',
    input: 'Front: Phrase',
    verify: ([card]) => card?.errors[0] === 'Card 1 is missing its Back field.',
  },
  {
    name: 'comma-separated tags',
    input: 'Front: Hello\nBack: Hola\nTags: basic, conversation, speaking',
    verify: ([card]) => card?.tags.join('|') === 'basic|conversation|speaking',
  },
  {
    name: 'optional fields',
    input: 'Front: Hello\nBack: Hola\nExample: Hello, Ana.\nNotes: A greeting.',
    verify: ([card]) => card?.example === 'Hello, Ana.' && card.notes === 'A greeting.',
  },
  {
    name: 'unknown field creates a warning',
    input: 'Front: Phrase\nBack: Translation\nAudio: file.mp3',
    verify: ([card]) => card?.warnings.length === 1 && card.errors.length === 0,
  },
  {
    name: 'empty blocks are ignored',
    input: '---\n\n---\nFront: Kept\nBack: Conservada\n---\n\n---',
    verify: (cards) => cards.length === 1 && cards[0]?.front === 'Kept',
  },
  {
    name: 'extra whitespace is trimmed',
    input: '  Front:   Hello there   \n Back:   Hola   \n Tags:  one,  two  ',
    verify: ([card]) => card?.front === 'Hello there' && card.back === 'Hola' && card.tags[1] === 'two',
  },
  {
    name: 'separator must occupy its line',
    input: 'Front: One --- still one card\nBack: Uno',
    verify: (cards) => cards.length === 1 && cards[0]?.front === 'One --- still one card',
  },
]

export const runParserManualExamples = (): string[] =>
  parserManualExamples
    .filter((example) => !example.verify(parseCards(example.input)))
    .map((example) => example.name)
