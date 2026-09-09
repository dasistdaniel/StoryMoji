# Emoji Cards – Projektbeschreibung

## 1. Zusammenfassung

Emoji Cards ist eine kindgerechte, farbenfrohe Web-App als digitale Variante von
"Story Cubes". Der Nutzer zieht 1–6 Karten, jede Karte zeigt ein großes Emoji mit
dem passenden Begriff darunter. Aus den gezogenen Karten denkt man sich gemeinsam
eine Geschichte aus. Zusätzlich schlägt die App Spielideen vor
("Erzähle eine Superheldengeschichte mit den angezeigten Gegenständen").

Die App ist eine reine statische Webseite (HTML/CSS/JS), ohne Backend, ohne
Datenbank. Sie lässt sich durch simples Ausliefern der Dateien über einen
nginx (oder jeden anderen Static-Host) betreiben.

Zielgruppe: Eltern mit Kindern ab ca. 4 Jahren, Grundschule, Kita, Logopädie.
Primärer Anwendungsfall: Vater/Mutter + Kind (6 Jahre) am Handy oder PC.

## 2. Ziele und Nicht-Ziele

### Ziele
- Sofort spielbar ohne Anleitung, ohne Konto, ohne Installation.
- Funktioniert offline nach dem ersten Laden (installierbare PWA, optional).
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

1. Nutzer öffnet die Seite. Es sind z. B. 3 Karten sichtbar, alle Kategorien gemischt.
2. Nutzer stellt die Anzahl Karten auf 4 und wählt die Kategorie "Tiere".
3. Nutzer tippt auf "Neu mischen" – alle 4 Karten werden neu und zufällig gezogen.
4. Eine Karte passt nicht in die Geschichte – Nutzer tippt auf genau diese Karte,
   sie wird durch eine neue zufällige Karte (derselben Kategorie) ersetzt.
5. Nutzer tippt auf "Spielidee" und bekommt einen Vorschlag angezeigt.
6. Kind erzählt die Geschichte.

## 4. Funktionale Anforderungen

### 4.1 Kartenanzeige
- FR-1: Es werden zwischen 1 und 6 Karten gleichzeitig angezeigt.
- FR-2: Jede Karte zeigt ein Emoji (groß) und den zugehörigen Begriff in der
  aktiven Sprache.
- FR-3: Das Kartenraster ist responsiv:
  - 1–2 Karten: eine Reihe
  - 3–4 Karten: 2 Spalten
  - 5–6 Karten: 3 Spalten (Desktop), 2 Spalten (Handy)
- FR-4: Karten haben eine kurze Einblende-/Flip-Animation beim Ziehen
  (per `prefers-reduced-motion` abschaltbar).

### 4.2 Anzahl der Karten
- FR-5: Ein Steuerelement (Buttons 1–6 oder Plus/Minus) legt die Anzahl fest.
- FR-6: Erhöhen der Anzahl zieht nur die neuen Karten zusätzlich, bestehende
  Karten bleiben unverändert. Verringern entfernt Karten von rechts.
- FR-7: Die zuletzt gewählte Anzahl wird lokal gespeichert (localStorage).

### 4.3 Kategorien / Stapel
- FR-8: Eine Kategorieauswahl (Dropdown oder Chips) bestimmt, aus welchem Stapel
  gezogen wird.
- FR-9: Option "Alle Kategorien" (Standard) mischt alle Stapel zusammen.
- FR-10: Beim Neu-Mischen oder Nachziehen bleibt die gewählte Kategorie erhalten.
- FR-11: Vorgeschlagene Kategorien (Startumfang):
  Tiere, Gegenstände, Natur, Essen, Menschen & Berufe, Orte, Fahrzeuge,
  Gefühle, Fantasie & Magie, Wetter & Himmel, Sport & Freizeit, Symbole.
- FR-12: Die zuletzt gewählte Kategorie wird lokal gespeichert.

### 4.4 Ziehen und Mischen
- FR-13: Klick/Tap auf eine einzelne Karte ersetzt nur diese durch eine neue
  zufällige Karte (aus der aktiven Kategorie).
- FR-14: Button "Alle mischen" zieht alle sichtbaren Karten neu.
- FR-15: Ziehen ist ohne Zurücklegen innerhalb einer Ziehung: keine Karte
  erscheint doppelt, solange die Kategorie genug Einträge hat.
- FR-16: Hat eine Kategorie weniger Einträge als angeforderte Karten, werden
  so viele wie möglich eindeutig gezogen, der Rest darf sich wiederholen
  (mit dezentem Hinweis).
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

### 4.7 Sonstiges
- FR-26: "Teilen/Screenshot"-freundlich: aktuelle Ziehung als Permalink
  (Kartenstand + Kategorie in URL-Hash kodiert), damit man dieselbe Ziehung
  erneut öffnen kann. Optional für v1.
- FR-27: Vollbild-Button für Präsentation am großen Bildschirm. Optional.

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

### 6.1 Technologie-Empfehlung
- **Build-Tool:** Vite (nur für Entwicklung/Build; Ergebnis ist statisch).
- **Framework:** Kein schweres Framework nötig. Empfehlung: Vanilla JS
  (ES-Module) oder leichtgewichtig Preact. Entscheidung im ersten Sprint.
- **Styling:** Reines CSS mit Custom Properties (Theme-Farben, Spacing),
  CSS Grid für das Kartenraster. Kein CSS-Framework.
- **i18n:** Eigene kleine Lösung: JSON-Dateien pro Sprache + `t(key)`-Funktion.
- **PWA (optional):** `manifest.webmanifest` + Service Worker (Workbox oder
  handgeschrieben) für Offline-Betrieb und "Zum Homescreen hinzufügen".
- **Icons/Emoji:** Unicode-Emoji nativ rendern. Optional Twemoji-SVGs
  (selbst gehostet) für einheitliche Darstellung über alle Geräte.

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
  language: "de",
  category: "all",
  count: 3,
  drawn: [cardId, cardId, cardId]   // aktuelle Ziehung
}
```

Persistiert in `localStorage` unter einem Schlüssel `emoji-cards:v1`.
`drawn` optional zusätzlich im URL-Hash für teilbare Ziehungen.

### 6.5 Kernfunktionen (Module)

- `store.js` – Zustand laden/speichern, Subscribe.
- `deck.js` – `drawCards(category, count, exclude)`, `redrawOne(index)`,
  `shuffleAll()`; nutzt `crypto.getRandomValues` + Fisher-Yates.
- `i18n.js` – `t(key)`, `setLanguage(lang)`, Platzhalter-Ersetzung.
- `prompts.js` – `randomPrompt()`, füllt `{card}`-Platzhalter.
- `ui/` – Rendering von Kartenraster, Steuerleiste, Ideen-Panel.
- `pwa/` – Service Worker + Manifest (optional).

### 6.6 Projektstruktur (Vorschlag)

```
emoji-cards/
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
│  ├─ ui/
│  └─ data/
│     ├─ cards.json
│     ├─ prompts.json
│     └─ i18n/
│        ├─ de.json
│        └─ en.json
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
- **Bedienung:** Große Touch-Ziele (mind. 44×44 px). Wichtige Aktionen
  ("Alle mischen", "Spielidee") als große Buttons unten, gut mit dem Daumen
  erreichbar.
- **Feedback:** Kurze Animation + optionaler dezenter Sound beim Ziehen
  (standardmäßig aus, per Toggle einschaltbar).
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
2. Inhalt von `dist/` nach `/var/www/emoji-cards/` kopieren (rsync/scp/CI).
3. nginx Server-Block:

```nginx
server {
    listen 80;
    server_name emoji-cards.example.com;
    root /var/www/emoji-cards;
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

- Ca. 12 Kategorien.
- Mindestens 15 Karten pro Kategorie (Ziel: 20–30), also ~200–350 Karten gesamt.
- Mindestens 15 Spielideen.
- Vollständige DE- und EN-Übersetzung aller Karten, Ideen und UI-Texte.

## 10. Qualitätssicherung

- Unit-Tests (Vitest) für `deck.js` (Zufall/Eindeutigkeit/Nachziehen),
  `i18n.js`, `prompts.js` (Platzhalter).
- Manuelle Testmatrix: iOS Safari, Android Chrome, Desktop Firefox/Chrome.
- Lighthouse-Ziel: Performance ≥ 95, Accessibility ≥ 95, Best Practices ≥ 95,
  PWA "installable" (falls PWA umgesetzt).
- Datencheck-Skript: prüft, dass jede Karte eine gültige Kategorie hat und
  in allen Sprachen einen Begriff besitzt.

## 11. Meilensteine

1. **M1 – Grundgerüst:** Projekt-Setup (Vite), Kartenraster, Zufallsziehung,
   Anzahl 1–6, "Alle mischen", Einzelkarte nachziehen. Nur Deutsch, feste Farben.
2. **M2 – Kategorien:** Kategorieauswahl, "Alle Kategorien", Persistenz in
   localStorage, Kategorie-Akzentfarben.
3. **M3 – Spielideen:** Ideen-Panel, Platzhalter-Ersetzung, "Nächste Idee".
4. **M4 – i18n:** DE/EN-Umschalter, alle Texte lokalisiert, Browsersprache-Default.
5. **M5 – Design-Feinschliff:** Schriften, Animationen, Dark Mode,
   Accessibility-Durchgang, responsive Feinheiten.
6. **M6 – Inhalte:** Karten- und Ideen-Datenbank auf Zielumfang füllen.
7. **M7 – PWA & Deployment:** Manifest, Service Worker, nginx-Setup,
   optionale CI. Release v1.0.

## 12. Ausblick (nach v1)

- Eigener Karten-Editor / Import eigener Wortlisten.
- Weitere Sprachen (FR, ES, ...).
- "Timer"-Modus (Geschichte in 60 Sekunden).
- Themen-Packs (Weihnachten, Piraten, Weltraum).
- Würfel-Wurf-Modus mit 9 Karten wie klassische Story Cubes.
- Vorlese-Funktion (Web Speech API) für die Begriffe.
- Favoriten / gespeicherte Lieblingsziehungen.

## 13. Offene Punkte / Entscheidungen

- Vanilla JS oder Preact? (Empfehlung: mit Vanilla starten.)
- Native Emoji oder Twemoji-SVG? (Empfehlung: nativ in v1, Twemoji als Option.)
- PWA in v1 oder v1.1? (Empfehlung: Manifest in v1, Service Worker in v1.1.)
- Teilbare Ziehung per URL-Hash – v1 oder später?
- Sound-Effekte – gewünscht?
