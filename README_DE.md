🌍 [English](README.md) | [Deutsch](README_DE.md) | [Fran&ccedil;ais](README_FR.md) | [Espa&ntilde;ol](README_ES.md) | [Italiano](README_IT.md)

<div align="center">
<img src="foodai_banner.png" alt="FoodAI Banner" width="100%" />
</div>

# FoodAI

Ein selbst gehosteter Kücheninventar-Manager mit KI-gestütztem Barcode-Scanning, Rezeptgenerierung und Essensplanung. Entwickelt mit React, Express und SQLite.

[![PayPal](https://img.shields.io/badge/PayPal-Spenden-blue?logo=paypal)](https://www.paypal.com/paypalme/germanquestions)

---

## Sicherheitshinweis
FoodAI hat **keine eingebaute Authentifizierung**. Es ist nur für vertrauenswürdige lokale Netzwerke gedacht. Setze es NICHT dem öffentlichen Internet aus, ohne einen Reverse Proxy mit Authentifizierung hinzuzufügen (z.B. Authelia, Authentik oder HTTP Basic Auth via Caddy/nginx).

---

## Funktionen

- **Barcode-Scanner** -- Scanne EAN/UPC-Barcodes mit der Handykamera. Produkte werden über OpenFoodFacts und UPCItemDB nachgeschlagen und lokal zwischengespeichert.
- **KI-Produkterkennung** -- Richte die Kamera auf ein beliebiges Lebensmittel und lass die KI Produkt, Kategorie, Menge und Ablaufdatum erkennen.
- **Inventar pro Packung** -- Jede physische Packung wird einzeln erfasst mit Offen/Geschlossen-Status, Füllstand und Packungsgröße.
- **MHD-Scanning** -- OCR via Tesseract.js mit KI-Fallback zum Lesen von Mindesthaltbarkeitsdaten von Verpackungen.
- **KI-Rezeptgenerierung** -- Generiere einzelne Rezepte oder komplette Wochenpläne basierend auf deinem aktuellen Inventar, mit Priorisierung bald ablaufender Produkte.
- **Zusätzliche Zutaten** -- Optional kann die KI eine begrenzte Anzahl von Zutaten vorschlagen, die du nicht vorrätig hast.
- **Lieblingsrezepte** -- Speichere und verwende Rezepte wieder, die dir gefallen.
- **Essenskalender** -- Plane Mahlzeiten für bestimmte Tage, markiere sie als gekocht und ziehe Zutaten automatisch vom Inventar ab.
- **Intelligenter Abzug** -- Beim Kochen öffnet das System Packungen nach Bedarf und erstellt "geöffnete" Inventareinträge mit angepasstem Ablaufdatum (KI-geschätzt).
- **Einkaufsliste** -- Berechnet automatisch fehlende Zutaten für geplante Mahlzeiten.
- **Freies Kochen** -- Fotografiere deine Zutaten auf der Arbeitsfläche; die KI gleicht sie mit dem Inventar ab und schlägt Mengen vor.
- **Bring!-Integration** -- Sende fehlende Zutaten an die Bring!-Einkaufslisten-App (Platzhalter -- Zugangsdaten werden in der App konfiguriert).
- **Spiegelanzeige** -- Ein eigenständiger `/mirror/today`-Endpunkt im dunklen Design, der das heutige Rezept anzeigt -- geeignet zum Einbetten auf einem Smart Mirror oder Tablet.
- **Multi-KI-Anbieter** -- Wechsle zwischen Gemini, OpenAI, Anthropic, DeepSeek, Moonshot oder Ollama (lokal) direkt in den Einstellungen.
- **PWA** -- Installierbar als Progressive Web App auf Mobilgeräten.
- **Dark/Light/Custom Theme** -- Wechsle zwischen hellem, dunklem und benutzerdefiniertem Design in den Einstellungen. Das benutzerdefinierte Theme unterstützt den Upload einer CSS-Datei.
- **Preisverfolgung pro Artikel** -- Jeder Inventarartikel kann einen Preis (EUR) haben. Das Dashboard zeigt den gesamten Lagerwert an.
- **Lagerort** -- Weise Artikeln einen Lagerort zu: Vorratsschrank, Kühlschrank, Gefrierschrank, Speisekammer oder Keller.
- **Mindestbestandswarnungen** -- Lege einen Mindestbestand pro Artikel fest. Das Dashboard zeigt die Anzahl der Artikel mit niedrigem Bestand an.
- **RSS-Kochinspiration** -- Die Dashboard-Seitenleiste zeigt tägliche Rezeptideen von GuteKueche.de (DE) oder BBC Good Food (EN), mit TheMealDB als Fallback.
- **Live-KI-Modellliste** -- Das Dropdown in den Einstellungen ruft verfügbare Modelle von der API des Anbieters ab (Gemini, OpenAI, Anthropic, DeepSeek, Moonshot, Ollama).
- **Sicherheitsverbesserungen** -- Rate-Limiting auf KI-Endpunkten, XSS-Schutz, SSRF-Validierung, maskierte Geheimnisse, Non-Root-Docker-Container.

## Screenshots

<!-- Screenshots hier einfügen -->

## Technologie-Stack

| Schicht | Technologie |
|---------|------------|
| Frontend | React 19, TypeScript, React Router v7, Tailwind CSS v4, Framer Motion |
| Backend | Node.js, Express, TypeScript (tsx) |
| Datenbank | SQLite via better-sqlite3 |
| Scanning | html5-qrcode, Tesseract.js |
| KI SDKs | @google/genai, openai, @anthropic-ai/sdk |
| Build | Vite, vite-plugin-pwa |
| Icons | Lucide React |
| Deployment | Docker, docker-compose |

## KI-Anbieter

Alle Anbieter sind in den In-App-Einstellungen konfigurierbar. Du kannst den API-Schlüssel setzen, Modelle auswählen und separate Modelle für die Haupt-KI (Rezepte, Scanning) und die Berater-KI (Mengeneinschätzung, Ablaufprüfungen) festlegen.

| Anbieter | Hinweise |
|----------|----------|
| Google Gemini | Jedes Modell (z.B. Gemini 2.5 Flash/Pro). Modell-ID in den Einstellungen eingeben. |
| OpenAI | Jedes Modell (z.B. GPT-4o, o1). Modell-ID in den Einstellungen eingeben. |
| Anthropic | Jedes Modell (z.B. Claude Opus 4.6, Sonnet). Modell-ID in den Einstellungen eingeben. |
| DeepSeek | Jedes Modell (z.B. deepseek-chat). Modell-ID in den Einstellungen eingeben. |
| Moonshot (Kimi) | Jedes Modell. Modell-ID in den Einstellungen eingeben. |
| Ollama (lokal) | Jedes lokal heruntergeladene Modell (llama3, mistral, llava, etc.) |

## Erste Schritte

### Voraussetzungen

- Node.js 20+ (22 empfohlen)
- Ein API-Schlüssel von mindestens einem KI-Anbieter (Gemini Free Tier funktioniert)

### Lokale Entwicklung

```bash
# Abhängigkeiten installieren
npm install

# Umgebungsdatei erstellen
cp .env.example .env.local
# .env.local bearbeiten und GEMINI_API_KEY eintragen (oder andere Anbieter in der App konfigurieren)

# Entwicklungsserver starten (Express + Vite HMR)
npm run dev
```

Die App ist erreichbar unter:
- **https://localhost:3000** (HTTPS mit automatisch generiertem selbstsigniertem Zertifikat -- erforderlich für Kamerazugriff auf Mobilgeräten)
- **http://localhost:3001** (HTTP für lokales Einbetten, z.B. Smart-Mirror-Iframes)

> Das selbstsignierte Zertifikat löst beim ersten Besuch eine Browserwarnung aus. Akzeptiere sie, um fortzufahren.

### Produktions-Build

```bash
npm run build    # Baut das Frontend nach dist/
npm start        # Startet den Produktionsserver
```

## Docker-Deployment

Vorgefertigte Multi-Arch-Images (amd64 + arm64) werden bei jedem Release in der GitHub Container Registry veröffentlicht.

```yaml
services:
  foodai:
    image: ghcr.io/jiromusik/foodai:latest
    container_name: foodai
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - foodai-data:/app/data
    env_file:
      - .env
    environment:
      - DB_DIR=/app/data
      - NODE_ENV=production

volumes:
  foodai-data:
```

### HTTPS

FoodAI benötigt HTTPS für den Kamerazugriff auf Mobilgeräten. Ein selbstsigniertes Zertifikat wird beim ersten Start automatisch generiert. Akzeptiere die Browserwarnung einmalig, oder binde deine eigenen Zertifikate ein:

```yaml
volumes:
  - ./certs/cert.pem:/app/data/server.cert:ro
  - ./certs/key.pem:/app/data/server.key:ro
```

## Umgebungsvariablen

| Variable | Erforderlich | Standard | Beschreibung |
|----------|-------------|----------|--------------|
| `GEMINI_API_KEY` | Nein | -- | Standard-Gemini-API-Schlüssel (kann auch in der App gesetzt werden) |
| `DB_DIR` | Nein | `./` | Verzeichnis für SQLite-Datenbank und SSL-Zertifikate |
| `HTTP_PORT` | Nein | `3001` | Port für den HTTP-Server |
| `NODE_ENV` | Nein | -- | Auf `production` setzen, um das vorgebaute Frontend auszuliefern |

## Projektstruktur

```
server.ts          Express-Backend (API-Routen, KI-Integration, Datenbank)
src/
  App.tsx          React-Router-Konfiguration
  main.tsx         Einstiegspunkt
  types.ts         TypeScript-Interfaces
  pages/
    Dashboard.tsx  Übersicht (ablaufende Artikel, offene Packungen, heutige Mahlzeiten)
    Inventory.tsx  Inventarverwaltung pro Packung
    Scanner.tsx    Barcode- + KI-Kamera-Scanner
    Recipes.tsx    KI-Rezeptgenerierung (Einzel + Woche)
    Calendar.tsx   Essensplanungs-Kalender
    FreeCook.tsx   Freier Koch-Assistent
    ShoppingList.tsx  Automatisch generierte Einkaufsliste
    Settings.tsx   KI-Anbieter, Modell- und Integrationseinstellungen
  components/
    Navigation.tsx      Untere Navigationsleiste
    RecipeCard.tsx       Rezeptanzeige-Komponente
    OpenedItemsModal.tsx Modal für Ablaufdatum-Anpassungen geöffneter Artikel
```

## Übersetzungen beitragen

FoodAI verwendet [react-i18next](https://react.i18next.com/). Übersetzungsdateien befinden sich in `src/i18n/locales/`.

So fügst du eine neue Sprache hinzu:

1. Kopiere `src/i18n/locales/en.json` nach `src/i18n/locales/xx.json`
2. Übersetze alle Werte (Schlüssel auf Englisch lassen)
3. Füge den Import in `src/i18n/i18n.ts` hinzu
4. Füge die Sprachoption in `src/pages/Settings.tsx` hinzu
5. Erstelle einen PR!

---

## Lizenz

Apache-2.0 — siehe [LICENSE](LICENSE)

---

<div align="center">

**Built with ❤️ and AI by [N3LSON](https://nnelson.de/)**

[![PayPal](https://img.shields.io/badge/Buy_me_a_coffee-PayPal-blue?logo=paypal)](https://www.paypal.com/paypalme/germanquestions)

</div>
