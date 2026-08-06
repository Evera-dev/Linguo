# Linguo

Linguo is a local React application that turns structured language-learning cards into Anki notes through [AnkiConnect](https://foosoft.net/projects/anki-connect/).

## Requirements

- Node.js and pnpm
- Anki running locally
- AnkiConnect installed and listening at `http://127.0.0.1:8765`

## Development

```bash
pnpm install
pnpm dev
```

Available verification commands:

```bash
pnpm lint
pnpm build
```

The parser's ten framework-free manual cases are in `src/features/cards/cardParser.manual.ts`. They cover valid and invalid cards, separators, optional and unknown fields, tags, empty blocks, and whitespace.

## Card format

```text
Front: I ran into an old friend.
Back: Me encontré con un viejo amigo.
Example: I ran into an old friend at the supermarket.
Notes: “Run into” means to meet someone unexpectedly.
Tags: phrasal-verb, conversation

---

Front: It turned out to be easier than expected.
Back: Resultó ser más fácil de lo esperado.
```

`Front` and `Back` are required. `Example`, `Notes`, and comma-separated `Tags` are optional. A line containing only `---` starts a new card.

## Scope

The MVP stores only the latest pasted text, selected deck, and post-import text preference in `localStorage`. It has no backend, accounts, cloud sync, OpenAI integration, or data collection.
