# Storymoji – Projektbeschreibung

## 1. Zusammenfassung

Storymoji ist eine kindgerechte, farbenfrohe Web-App als digitale Variante von
"Story Cubes". Der Nutzer zieht 1–6 Karten, jede Karte zeigt ein großes Emoji mit
dem passenden Begriff darunter. Aus den gezogenen Karten denkt man sich gemeinsam
eine Geschichte aus. Zusätzlich schlägt die App Spielideen vor
("Erzähle eine Superheldengeschichte mit den angezeigten Gegenständen").

Die App ist eine reine statische Webseite (HTML/CSS/JS), ohne Backend, ohne
Datenbank. Sie lässt sich durch simples Ausliefern der Dateien über einen
nginx (oder jeden anderen Static-Host) betreiben. Zieldomain (vorerst):
`https://storymoji.nichtregistriert.de`.

Zielgruppe: Eltern mit Kindern ab ca. 4 Jahren, Grundschule, Kita, Logopädie.
Primärer Anwendungsfall: Vater/Mutter + Kind (6 Jahre) am Handy oder PC.

## 2. Ziele und Nicht-Ziele

### Ziele

- Sofort spielbar ohne Anleitung, ohne Konto, ohne Installation.
- Installierbar (PWA-Manifest) ab v1; vollständiger Offline-Betrieb ab v1.1.
- Mehrsprachig: Deutsch (primär) und Englisch (sekundär), leicht erweiterbar.
- Kindgerechtes, buntes, freundliches Design mit großen Klickflächen.
- Minimaler Betriebsaufwand: statische Dateien hinter nginx, kein Server-State.
- Code auf Englisch geschrieben und kommentiert.

### Nicht-Ziele (bewusst ausgeschlossen)

- Kein Benutzerkonto, kein Login, kein Cloud-Sync.
- Keine Datenbank, kein API-Server, keine serverseitige Logik.
- Kein Tracking, keine Werbung, keine Cookies zu Marketingzwecken.
- Keine Online-Multiplayer-Funktion.
- Kein Karten-Editor für eigene Emojis in v1 (siehe Ausblick).

## 3. Nutzer und Kernszenario

1. Nutzer öffnet die Seite. Es sind z. B. 3 Karten sichtbar, jede aus "Alle
   Kategorien".
2. Nutzer stellt die Anzahl Karten auf 4 und wählt für die erste Karte die
   Kategorie "Tiere", für die zweite "Fahrzeuge", die anderen bleiben gemischt.
3. Nutzer tippt auf "Karten mischen" – jede Karte wird neu gezogen, jeweils aus
   ihrer eigenen Kategorie. (Mit "Kategorien mischen" werden stattdessen die
   Kategorien selbst neu ausgewürfelt.)
4. Eine Karte passt nicht in die Geschichte – Nutzer tippt auf genau diese Karte,
   sie wird durch eine neue zufällige Karte (aus der Kategorie dieser Karte)
   ersetzt.
5. Nutzer tippt auf "Spielidee" und bekommt einen Vorschlag angezeigt.
6. Kind erzählt die Geschichte.

## 4. Funktionale Anforderungen

### 4.1 Kartenanzeige

- FR-1: Es werden zwischen 1 und 6 Karten gleichzeitig angezeigt.
- FR-2: Jede Karte zeigt ein Emoji (groß) und den zugehörigen Begriff in der
  aktiven Sprache.
- FR-3: **Kartenraster, Anzahl-Steuerung und Aktionsbuttons teilen sich eine
  gemeinsame, zentrierte Spalte (max. 700 px)**, damit alles bündig
  übereinander steht. Die Grid-Spalten sind `1fr`-Spuren (kein Überlauf möglich).
  **Jede Karte hat an jeder Anzahl und Bildschirmbreite dasselbe
  Seitenverhältnis (5 : 6.4)**; nur die Spaltenzahl ändert sich:
  - 1 Karte: einzeln (bis 240 px), im Raster zentriert
  - 2 Karten: 2 nebeneinander (Raster bis 460 px)
  - 3 Karten: 3 (ab 620 px) bzw. 2 + 1 (Handy)
  - 4 Karten: 4 in einer Reihe (ab 760 px) bzw. 2 × 2
  - 5–6 Karten: 3 pro Reihe (ab 620 px) bzw. 2 pro Reihe
  - Emoji- und Textgröße skalieren mit der Kartenbreite (Container-Queries),
    nicht mit dem Viewport; lange Begriffe brechen mit Silbentrennung um.
- FR-4: Beim Ziehen animiert **nur die tatsächlich neu gezogene Karte** kurz
  (Einblenden/„Pop"). Ein Re-Render aus anderem Grund (Sprachwechsel, andere
  Karte antippen) löst keine Animation aus. Per `prefers-reduced-motion`
  abschaltbar.

### 4.2 Anzahl der Karten

- FR-5: Ein Steuerelement (Buttons 1–6 oder Plus/Minus) legt die Anzahl fest.
- FR-6: Erhöhen der Anzahl zieht nur die neuen Karten zusätzlich, bestehende
  Karten bleiben unverändert. Verringern entfernt Karten von rechts.
- FR-7: Die zuletzt gewählte Anzahl wird lokal gespeichert (localStorage).

### 4.3 Kategorien / Stapel (pro Karte)

- FR-8: **Jede Kartenposition ("Slot") hat ihre eigene Kategorieauswahl** – ein
  kleines Dropdown direkt an der Karte. Es bestimmt, aus welchem Stapel diese
  eine Karte gezogen wird. Es gibt keine globale Kategorie mehr.
- FR-9: Option "Alle Kategorien" (Standard für jeden neuen Slot) zieht für diesen
  Slot aus allen Stapeln zusammen.
- FR-10: Ändert man die Kategorie eines Slots, wird sofort eine passende neue
  Karte für diesen Slot gezogen. Die anderen Karten bleiben unverändert.
- FR-10a: Beim Nachziehen ("Karten mischen" oder Tap auf eine Karte) bleibt die
  pro Slot gewählte Kategorie erhalten. Nur "Kategorien mischen" ändert sie.
- FR-11: Kategorien (Startumfang): Tiere, Gegenstände, Natur, Essen,
  Menschen & Berufe, Orte, Fahrzeuge, Gefühle, Fantasie & Magie,
  Wetter & Himmel, Sport & Freizeit, Symbole, Zahlen (0–9, feste 10er-Menge).
- FR-12: Die pro Slot gewählten Kategorien werden lokal gespeichert (Array).
  Neue Slots (Anzahl erhöhen) übernehmen die Kategorie des letzten Slots.

### 4.4 Ziehen und Mischen

- FR-13: Klick/Tap auf eine einzelne Karte ersetzt nur diese durch eine neue
  zufällige Karte aus der Kategorie **dieses Slots**.
- FR-14: Button "Karten mischen" zieht jede Karte neu – jeweils aus der Kategorie
  ihres Slots (Slot-Kategorien bleiben).
- FR-14a: Button "Kategorien mischen" weist jedem Slot eine neue zufällige
  Kategorie zu (aus den echten Kategorien, nie "Alle Kategorien"; verschieden,
  solange genug Kategorien da sind) und zieht dazu passende Karten.
- FR-15: Ziehen ist so weit wie möglich ohne Zurücklegen: keine Karte erscheint
  doppelt, solange die beteiligten Kategorien genug Einträge haben.
- FR-16: Reichen die Karten einer Kategorie nicht (z. B. mehrere Slots derselben
  kleinen Kategorie), dürfen sich Karten wiederholen.
- FR-17: Zufall über `crypto.getRandomValues` (Fisher-Yates-Shuffle).

### 4.5 Spielideen / Vorschläge

- FR-18: Button "Spielidee" zeigt einen zufälligen Prompt aus einer Liste.
- FR-19: Prompts sind lokalisiert und können Platzhalter nutzen, z. B.
  "Die Prinzessin ist auf der Suche nach {karte}" – Platzhalter werden mit
  aktuell gezogenen Karten gefüllt.
- FR-20: Startliste enthält mindestens 15 Ideen, u. a.:
  - "Erzähle eine Superheldengeschichte mit den angezeigten Gegenständen."
  - "Die Prinzessin ist auf der Suche nach ..."
  - "Wie können die Gegenstände zusammen die Welt retten?"
  - "Was passiert, wenn man das Tier mit dem Gegenstand kreuzt?"
  - "Erzähle die Geschichte rückwärts – vom Ende zum Anfang."
  - "Alle Dinge sind plötzlich lebendig. Was sagen sie?"
  - "Baue aus den Karten einen Traum."
- FR-21: Die Ideen-Anzeige lässt sich weiterklicken ("Nächste Idee").

### 4.6 Sprache

- FR-22: Sprachumschalter DE/EN, sichtbar und mit Flaggen-/Textlabel.
- FR-23: Standardsprache = Browsersprache, sonst Deutsch.
- FR-24: Sprachwahl wird lokal gespeichert.
- FR-25: Umschalten übersetzt UI, Begriffe und Spielideen sofort ohne Reload;
  die gezogenen Karten bleiben dieselben (nur der Begriff wechselt die Sprache).

### 4.7 Teilbare Ziehung (v1)

- FR-26: Die aktuelle Ziehung wird in den URL-Hash kodiert – pro Slot ein Paar
  aus Kategorie und Karten-ID. Öffnet man diesen Link, werden exakt dieselben
  Karten und Slot-Kategorien wiederhergestellt (unabhängig von Sprache und
  lokalem Zustand).
- FR-26a: Der Hash ist **verschleiert** (`#d=<base64url>`), damit man an der
  URL nicht direkt ablesen kann, welche Karten liegen. Das ist reine
  Obfuskation, keine Sicherheit – der Base64-Inhalt ist von jedem dekodierbar.
  Ältere lesbare Links (`#draw=<kat>,<id>,…`) werden beim Öffnen weiterhin
  akzeptiert und sofort in die verschleierte Form umgeschrieben.
- FR-27: Button "Ziehung teilen" kopiert den Link in die Zwischenablage
  (Fallback: Link zum Markieren anzeigen). Wo verfügbar, `navigator.share`.
- FR-28: Der Hash wird bei jeder Änderung der Ziehung aktualisiert
  (`history.replaceState`, kein zusätzlicher History-Eintrag).
- FR-29: Ungültige/veraltete Karten-IDs im Hash werden ignoriert, fehlende
  Karten mit Zufallskarten aufgefüllt; ein defekter Base64-Hash wird ignoriert.

### 4.8 Sound (v1)

- FR-30: Dezente Soundeffekte beim Ziehen einer Karte, beim Nachziehen und
  beim "Karten mischen" / "Kategorien mischen". Kurze, weiche Töne (kindgerecht,
  nicht schrill).
- FR-31: Sound ist standardmäßig AUS. Ein sichtbarer Toggle (Lautsprecher-
  Symbol) schaltet ihn ein/aus; die Wahl wird in localStorage gespeichert.
- FR-32: Audio-Assets selbst gehostet (kleine `.ogg`/`.mp3`, gesamt < 30 KB),
  vorgeladen erst nach erster Nutzerinteraktion (Autoplay-Policy).
- FR-33: Bei `prefers-reduced-motion` bleibt Sound möglich, ist aber weiter
  opt-in; keine Kopplung an Animationen.

### 4.9 Sonstiges

- FR-34: Vollbild-Button für Präsentation am großen Bildschirm. Optional,
  nicht v1-kritisch.

## 5. Nicht-funktionale Anforderungen

- NFR-1: Rein statisch – nur HTML, CSS, JS und Bilder/Fonts. Kein Node-Server im Betrieb.
- NFR-2: Deployment = Dateien in ein Verzeichnis kopieren, das nginx ausliefert.
- NFR-3: Erstladezeit < 1 s auf 3G-Simulierung; Gesamtgröße (ohne Fonts) < 150 KB gzip.
- NFR-4: Läuft in aktuellen Versionen von Chrome, Firefox, Safari, Edge
  (Desktop + Mobile), inkl. iOS Safari.
- NFR-5: Bedienbar per Touch, Maus und Tastatur; sichtbarer Fokus.
- NFR-6: Barrierefreiheit: WCAG 2.1 AA angestrebt – Kontraste, Alt-Texte,
  ARIA-Labels für Karten und Buttons, `prefers-reduced-motion` respektiert.
- NFR-7: Kein externes Tracking, keine Drittanbieter-Requests zur Laufzeit
  (Fonts und alle Assets selbst gehostet).
- NFR-8: Datenschutz: Nur `localStorage` für Einstellungen, keine personen-
  bezogenen Daten.
- NFR-9: Code auf Englisch, sinnvoll kommentiert, konsistent formatiert
  (Prettier/ESLint).
- NFR-10: Inhalte (Karten, Ideen, Übersetzungen) in getrennten Datendateien,
  damit Nicht-Entwickler sie pflegen können.

## 6. Technischer Ansatz

### 6.1 Technologie-Entscheidungen (festgelegt)

- **Build-Tool:** Vite (nur für Entwicklung/Build; Ergebnis ist statisch).
- **Framework:** Vanilla JS mit ES-Modulen, kein Framework. Rendering über
  kleine Hilfsfunktionen (z. B. ein Mini-`h()`/Template-Literal-Ansatz).
  Begründung: geringer Umfang, minimale Bundle-Größe, keine Abhängigkeiten.
- **Styling:** Reines CSS mit Custom Properties (Theme-Farben, Spacing),
  CSS Grid für das Kartenraster. Kein CSS-Framework.
- **i18n:** Eigene kleine Lösung: JSON-Dateien pro Sprache + `t(key)`-Funktion.
- **Emoji:** In v1 native Unicode-Emojis. Die Darstellung läuft über EINE
  gekapselte Funktion `renderEmoji(emoji)` in `ui/`, sodass später Twemoji-SVGs
  (selbst gehostet) ohne Umbau der übrigen Logik ergänzt werden können.
- **PWA:** In v1 nur `manifest.webmanifest` + Icons (installierbar / "Zum
  Homescreen hinzufügen"). Ein Service Worker für vollständigen Offline-Betrieb
  kommt in v1.1 (siehe Meilensteine / Ausblick).
- **Sound:** Kleine, selbst gehostete Audio-Dateien; Wiedergabe über eine
  gekapselte `sound.js` (Web Audio API oder `<audio>`), opt-in, in localStorage
  gemerkt.
- **Teilen:** Ziehung wird als `<kat>,<id>,…` serialisiert und base64url-kodiert
  im URL-Hash abgelegt (`#d=…`, verschleiert – siehe FR-26a); `sharing.js`
  kümmert sich um Kodieren/Dekodieren (inkl. Legacy-`#draw=`), Lesen/Schreiben
  des Hash und den Kopier-/Share-Button.

### 6.2 Warum statisch reicht

Alle Logik (Zufall, Ziehen, Mischen, i18n, Ideen) läuft im Browser. Die
Kartendaten sind eine ausgelieferte JSON-Datei. Es gibt keinen gemeinsamen
Zustand zwischen Nutzern, daher kein Server, keine DB.

### 6.3 Datenmodell

`src/data/cards.<lang>.json` – oder eine Datei mit allen Sprachen:

```json
{
  "categories": [
    { "id": "animals", "label": { "de": "Tiere", "en": "Animals" } }
  ],
  "cards": [
    {
      "id": "dog",
      "emoji": "🐶",
      "category": "animals",
      "term": { "de": "Hund", "en": "Dog" }
    }
  ]
}
```

`src/data/prompts.json`:

```json
{
  "prompts": [
    {
      "id": "superhero",
      "text": {
        "de": "Erzähle eine Superheldengeschichte mit den Gegenständen.",
        "en": "Tell a superhero story using the shown objects."
      }
    },
    {
      "id": "princess-search",
      "text": {
        "de": "Die Prinzessin ist auf der Suche nach {card}.",
        "en": "The princess is searching for {card}."
      }
    }
  ]
}
```

`src/data/i18n/de.json`, `src/data/i18n/en.json` – UI-Strings.

### 6.4 App-Zustand (nur im Browser)

```
state = {
  language: "de",          // localStorage
  soundEnabled: false,     // localStorage
  slots: [                 // aktuelle Ziehung
    { category: "animals", card: <Card> },   // je Slot: eigene Kategorie + Karte
    { category: "all",     card: <Card> },
    ...
  ]
}
```

Persistiert in `localStorage` unter `storymoji:v1`: `language`, `soundEnabled`
und `slotCategories` (nur die Kategorien, als Array). Die gezogenen Karten
stehen ausschließlich im URL-Hash (pro Slot `<kategorie>,<karten-id>`, das Ganze
base64url-kodiert als `#d=…`), damit Ziehungen teilbar, aber nicht direkt
ablesbar sind. Beim Laden gilt: Hash schlägt localStorage, localStorage schlägt
Standardwerte (3 Slots × "Alle Kategorien").

### 6.5 Kernfunktionen (Module)

- `store.js` – generischer Zustand (merge/subscribe) mit optionalem
  `persist(state)`-Serializer nach localStorage.
- `deck.js` – reine Slot-Logik: `drawOne(cards, category, exclude)`,
  `drawSlots(cards, categories)`, `redrawSlot(cards, slots, index)`,
  `reshuffleSlots`, `resizeSlots`, `randomCategories(ids, count)`; nutzt
  `crypto.getRandomValues` + Fisher-Yates.
- `i18n.js` – `createTranslator(lang)` → `t(key, params)`, `{token}`-Ersetzung.
- `prompts.js` – `randomPrompt()`, füllt `{card}`-Platzhalter aus der Hand.
- `sharing.js` – Slots ↔ URL-Hash serialisieren/parsen, "Teilen"-Button
  (Clipboard + Fallback).
- `sound.js` – `play(name)`, `setEnabled(bool)`; synthetisiert Töne per Web
  Audio (keine Asset-Dateien), respektiert `soundEnabled`.
- `ui/dom.js` – `el()`-Helfer + `renderEmoji(emoji)` als einzige
  Emoji-Ausgabestelle (Twemoji-fähig).
- `main.js` – verdrahtet alles, Store-getriebenes Re-Render, Hash-Restore.
- `pwa/` – `manifest.webmanifest` + Icons in v1; Service Worker ab v1.1.

### 6.6 Projektstruktur (Vorschlag)

```
storymoji/
├─ public/
│  ├─ manifest.webmanifest
│  ├─ icons/                # PWA-Icons
│  └─ fonts/                # selbst gehostete Fonts
├─ src/
│  ├─ index.html
│  ├─ main.js
│  ├─ style.css
│  ├─ store.js
│  ├─ deck.js
│  ├─ i18n.js
│  ├─ prompts.js
│  ├─ sharing.js
│  ├─ sound.js
│  ├─ ui/
│  └─ data/
│     ├─ cards.json
│     ├─ prompts.json
│     └─ i18n/
│        ├─ de.json
│        └─ en.json
├─ public/
│  └─ sounds/               # kleine, selbst gehostete Audio-Assets
├─ dist/                    # Build-Ergebnis (wird von nginx ausgeliefert)
├─ package.json
├─ vite.config.js
├─ README.md
└─ PROJEKTBESCHREIBUNG.md
```

## 7. Design / UX

- **Look:** Bunt, weich, verspielt. Abgerundete Ecken (16–24 px), kräftige
  aber freundliche Farben, sanfte Schatten, große Emojis (mind. 64 px, auf der
  Karte skalierend bis ~30 % der Kartenhöhe).
- **Farbschema:** Helle Grundfläche, jede Kategorie hat eine eigene Akzentfarbe
  (Karten-Rahmen/Badge). Dunkelmodus optional über `prefers-color-scheme`.
- **Typografie:** Gut lesbare, runde Schrift (z. B. Nunito, Baloo 2, Fredoka) –
  selbst gehostet.
- **Bedienung:** Große Touch-Ziele (mind. 44×44 px). Die vier Aktionen
  ("Karten mischen", "Kategorien mischen", "Spielidee", "Ziehung teilen") als
  große Buttons unten – 2 × 2 ab 420 px Breite, darunter gestapelt – gut mit
  dem Daumen erreichbar.
- **Feedback:** Kurze Animation beim Ziehen; dazu dezenter Sound (standardmäßig
  aus, per Lautsprecher-Toggle einschaltbar – siehe FR-30 ff.).
- **Teilen:** Sichtbarer "Ziehung teilen"-Button erzeugt einen Link, der genau
  diese Kartenkombination wiederherstellt (siehe FR-26 ff.).
- **Kein Text-Overload:** Wenig UI-Text, viel Symbolik, aber alles mit
  Screenreader-Label.

Empfohlen: vor der Umsetzung 2–3 Mockups (Startbildschirm, Kartenraster
3 Karten, Ideen-Panel) – siehe TODO.

## 8. Build und Deployment

### Entwicklung

```
npm install
npm run dev      # Vite Dev-Server
```

### Build

```
npm run build    # erzeugt dist/ (statische Dateien)
npm run preview  # lokale Vorschau des Builds
```

### Deployment auf nginx

1. `npm run build`
2. Inhalt von `dist/` nach `/var/www/storymoji/` kopieren (rsync/scp/CI).
3. nginx Server-Block:

```nginx
server {
    listen 80;
    server_name storymoji.nichtregistriert.de;
    root /var/www/storymoji;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Lange Cache-Zeiten für gehashte Assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service Worker nicht cachen
    location = /sw.js {
        add_header Cache-Control "no-cache";
    }
}
```

Kein PHP, kein Reverse Proxy, kein Zertifikats-Sonderfall (Let's Encrypt
optional). Updates = neue Dateien hochladen.

### CI (optional)

GitHub Actions: bei Push auf `main` → `npm ci && npm run build` → per rsync/
SSH nach `dist/` auf den Server. Alternativ komplett manuell.

## 9. Inhaltsumfang v1

- Ca. 13 Kategorien (davon "Zahlen" mit fester 10er-Menge 0–9).
- Mindestens 15 Karten pro Kategorie (Ziel: 20–30), also ~200–350 Karten gesamt.
- Mindestens 15 Spielideen.
- Vollständige DE- und EN-Übersetzung aller Karten, Ideen und UI-Texte.

## 10. Qualitätssicherung

- Unit-Tests (Vitest) für `deck.js` (Zufall/Eindeutigkeit/Nachziehen),
  `i18n.js`, `prompts.js` (Platzhalter).
- Manuelle Testmatrix: iOS Safari, Android Chrome, Desktop Firefox/Chrome.
- Lighthouse-Ziel: Performance ≥ 95, Accessibility ≥ 95, Best Practices ≥ 95;
  ab v1 "installable", ab v1.1 voll PWA-tauglich (Offline).
- Tests für `sharing.js` (Hash ↔ Ziehung, Round-Trip, ungültige IDs) und
  `sound.js` (kein Ton bei `soundEnabled = false`).
- Datencheck-Skript: prüft, dass jede Karte eine gültige Kategorie hat und
  in allen Sprachen einen Begriff besitzt.

## 11. Meilensteine

Legende: ✅ erledigt · 🟡 teilweise · ⬜ offen

1. ✅ **M1 – Grundgerüst:** Projekt-Setup (Vite, Vanilla JS), Kartenraster,
   Zufallsziehung, Anzahl 1–6, "Karten mischen", Einzelkarte nachziehen.
   Native Emojis über `renderEmoji()`.
2. ✅ **M2 – Kategorien:** Kategorieauswahl **pro Karte** (Dropdown an jeder
   Karte), "Alle Kategorien", Persistenz der Slot-Kategorien in localStorage,
   Kategorie-Akzentfarben.
3. ✅ **M3 – Spielideen:** Ideen-Panel, Platzhalter-Ersetzung, "Nächste Idee".
4. ✅ **M4 – i18n:** DE/EN-Umschalter, alle Texte lokalisiert,
   Browsersprache-Default.
5. ✅ **M5 – Teilen & Sound:** Ziehung im URL-Hash serialisieren, "Ziehung
   teilen"-Button (Clipboard/`navigator.share`); Soundeffekte + opt-in-Toggle.
6. 🟡 **M6 – Design-Feinschliff:** Farbschema, Animationen, Dark Mode und
   `prefers-reduced-motion` stehen. Offen: eigene Schriftart einbinden,
   Feinschliff, formaler Accessibility-Durchgang / Lighthouse.
7. 🟡 **M7 – Inhalte:** 13 Kategorien, ~213 Karten, 18 Spielideen (DE + EN)
   vorhanden. Ziel: auf 20–30 Karten je Kategorie ausbauen, Ideen erweitern.
8. 🟡 **M8 – PWA-Manifest & Deployment:** `manifest.webmanifest` + SVG-Icons und
   `deploy/nginx.conf` stehen. Offen: gerasterte PNG-Icons (192/512),
   optionale CI. Danach **Release v1.0.**
9. ⬜ **M9 – Offline (v1.1):** Service Worker (Precache aller App-Assets +
   Daten), Update-Handling ("Neue Version verfügbar"), Offline-Test.

## 12. Ausblick (nach v1.1)

- Twemoji-SVGs als einheitliche Emoji-Darstellung (in `renderEmoji()` bereits
  vorbereitet), umschaltbar oder als Standard.
- Eigener Karten-Editor / Import eigener Wortlisten.
- Weitere Sprachen (FR, ES, ...).
- "Timer"-Modus (Geschichte in 60 Sekunden).
- Themen-Packs (Weihnachten, Piraten, Weltraum).
- Würfel-Wurf-Modus mit 9 Karten wie klassische Story Cubes.
- Vorlese-Funktion (Web Speech API) für die Begriffe.
- Favoriten / gespeicherte Lieblingsziehungen.
- Vollbild-/Präsentationsmodus (FR-34).

## 13. Getroffene Entscheidungen

| Frage             | Entscheidung                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------- |
| UI-Technologie    | **Vanilla JS** (ES-Module, kein Framework), Rendering über kleine Helfer                     |
| Emoji-Darstellung | **Native Emojis in v1**; gekapselt in `renderEmoji()`, Twemoji später ohne Umbau nachrüstbar |
| PWA               | **Manifest + Icons in v1** (installierbar); **Service Worker / Offline in v1.1**             |
| Teilbare Ziehung  | **In v1** – Ziehung im URL-Hash, "Ziehung teilen"-Button (FR-26 ff.)                         |
| Sound-Effekte     | **In v1** – dezente Töne, standardmäßig aus, opt-in-Toggle in localStorage (FR-30 ff.)       |

Noch offen / später zu klären:

- Konkrete Schriftart (Nunito / Baloo 2 / Fredoka) – im Design-Meilenstein.
- Dark Mode: nur `prefers-color-scheme` folgen oder zusätzlich manueller Toggle?
- Genaue Kodierung des URL-Hash (lesbare IDs vs. kompakte Base64-Indizes).
