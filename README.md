# Storymoji 🎴

A colourful, kid-friendly web app for making up stories – a digital take on
"Story Cubes". Draw 1–6 cards, each showing an emoji and its word, and invent a
story from them. The app also suggests play ideas
("Tell a superhero story using the things shown").

Target deployment: <https://storymoji.nichtregistriert.de>

- **No backend, no database** – a fully static site (`dist/`) served by any web
  server (nginx).
- **Bilingual** – German (primary) and English, switchable without a reload.
- **Offline-friendly** – installable via a web app manifest (full offline
  support planned for v1.1).
- **Private / GDPR-friendly** – no cookies, no tracking, no third-party
  requests; only `localStorage` for settings; access logs are IP-anonymised.
  See [`public/datenschutz.html`](./public/datenschutz.html) (privacy policy –
  **fill in the controller/contact placeholders before going live**).

See [`PROJEKTBESCHREIBUNG.md`](./PROJEKTBESCHREIBUNG.md) for the full concept and
requirements (in German).

## Development

```bash
npm install
npm run dev        # Vite dev server with hot reload
npm test           # unit tests (Vitest)
npm run check:data # validate card / prompt content
npm run build      # emit the static site into dist/
npm run preview    # serve the production build locally
```

Node 18+ is required.

## Project layout

```
index.html              app shell
src/
  main.js               wires everything to the DOM
  style.css             all styles (light + dark, reduced-motion aware)
  rng.js                crypto-backed random helpers
  deck.js               pure per-slot card-drawing logic
  store.js              generic state + localStorage persistence
  i18n.js               tiny translator, {token} interpolation
  prompts.js            play-idea prompts with {card} placeholders
  sharing.js            draw <-> URL hash, copy link
  sound.js              opt-in Web Audio sound effects
  ui/dom.js             el() helper + renderEmoji()
  data/
    cards.json          categories + cards (emoji, category, de/en term)
    prompts.json        play ideas
    i18n/de.json, en.json  UI strings
scripts/check-data.js   content integrity check
tests/                  Vitest specs
public/                 manifest + icons (copied verbatim into dist/)
```

## How it works

- **Each card has its own category picker.** A card is drawn from the category
  chosen on its own slot; "All categories" is the default.
- The **current draw** – one `category,cardId` pair per slot – lives in
  `location.hash`, base64url-encoded (`#d=…`) so a glance at the URL doesn't
  reveal the cards (obfuscation, not security). Any draw is shareable via its
  URL; legacy readable `#draw=` links still work. Language, the sound toggle and
  the per-slot categories are stored in `localStorage`.
- Tapping a card replaces just that card (from its slot's category). "Shuffle
  cards" redraws every card from its own slot category; "Shuffle categories"
  rolls a fresh random category for every slot and draws matching cards.
- Increasing the card count keeps the cards already on the table and only adds
  new slots (which inherit the last slot's category).
- All randomness goes through `crypto.getRandomValues` (Fisher–Yates shuffle).

## Content

Edit `src/data/cards.json` and `src/data/prompts.json` to change cards and play
ideas – no code changes needed. Run `npm run check:data` afterwards; it verifies
every card has a valid category and a term in every language.

## Deployment

### Plain nginx

1. `npm run build`
2. Copy the contents of `dist/` to the web root, e.g. `/var/www/storymoji/`.
3. Use the sample server block in [`deploy/nginx.conf`](./deploy/nginx.conf).

Updating the site = uploading the new `dist/` files.

### Docker (nginx container)

```bash
docker compose up -d --build      # builds the site + serves it on :7044
```

- [`deploy/Dockerfile`](./deploy/Dockerfile) – multi-stage: `node` builds,
  `nginx:alpine` serves `dist/`.
- [`deploy/nginx.docker.conf`](./deploy/nginx.docker.conf) – in-container nginx.
- [`docker-compose.yml`](./docker-compose.yml) – host port `7044` → container
  `80`, `restart: unless-stopped`, uses Docker's default bridge network.

To update: re-run `docker compose up -d --build`.

Current instance: `http://<lan-ip-redacted>:7044/` (container `storymoji`,
project dir `/home/daniel/storymoji`).

## Roadmap

Milestones and the "done" checklist are tracked in
[`PROJEKTBESCHREIBUNG.md`](./PROJEKTBESCHREIBUNG.md) section 11. Next up: raster
PNG app icons, a service worker for full offline play (v1.1), and expanding the
card set.
