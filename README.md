# Linguo

Linguo is a local React application that turns structured language-learning cards into Anki notes through [AnkiConnect](https://foosoft.net/projects/anki-connect/).

## Requirements

- Node.js and pnpm
- Anki running locally
- AnkiConnect installed and listening at `http://127.0.0.1:8765`
- Piper is optional and only required for pronunciation audio

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

Framework-free manual checks live next to the parser, Piper client, and Anki audio mapping. They cover card parsing, deterministic audio filenames, base64 encoding, HTML escaping, and the `Front` audio attachment.

## Optional pronunciation audio

Linguo can generate a WAV pronunciation of each card's `Front` with Piper. Audio generation is completely local and optional; text-only imports continue to work without Piper.

Install Python 3.11 or 3.12 from [python.org](https://www.python.org/downloads/windows/) and enable **Add Python to PATH**. Then install Piper and an English voice from PowerShell:

```powershell
python -m pip install "piper-tts[http]"
python -m piper.download_voices en_US-lessac-medium
python -m piper.http_server -m en_US-lessac-medium --host 127.0.0.1 --port 5000
```

On macOS or Linux, use `python3` instead of `python`. You can download other [supported Piper voices](https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/VOICES.md); review the license included with each voice model.

Keep the Piper terminal open while importing. Linguo connects through the local Vite proxy, lists the voices already downloaded by Piper, and applies one selected voice to the entire batch. Use either `pnpm dev` or `pnpm preview` so the proxy is available.

Audio is generated only after Anki duplicate validation succeeds. The resulting WAV is sent inside `addNotes`, attached to `Front`, and stored in Anki's media collection.

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

The MVP stores only the latest pasted text, selected deck, and post-import text preference in `localStorage`. It has no remote backend, accounts, cloud sync, OpenAI integration, or data collection. The selected Piper voice and audio toggle are session-only preferences.
