🌍 [English](README.md) | [Deutsch](README_DE.md) | [Fran&ccedil;ais](README_FR.md) | [Espa&ntilde;ol](README_ES.md) | [Italiano](README_IT.md)

<div align="center">
<img src="foodai_banner.png" alt="FoodAI Banner" width="100%" />
</div>

# FoodAI

Ein selbst gehosteter Kücheninventar-Manager mit KI-gestütztem Barcode-Scanning, Rezeptgenerierung und Essensplanung. Entwickelt mit React, Express und SQLite.

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

| Anbieter | Beispielmodelle |
|----------|----------------|
| Google Gemini | gemini-3-flash-preview, gemini-1.5-pro |
| OpenAI | gpt-4o, gpt-4o-mini |
| Anthropic | claude-3-5-sonnet-latest, claude-3-haiku |
| DeepSeek | deepseek-chat, deepseek-coder |
| Moonshot (Kimi) | moonshot-v1-8k, moonshot-v1-128k |
| Ollama (lokal) | llama3, mistral, llava (jedes Modell, das du heruntergeladen hast) |

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

Ein `Dockerfile` und eine `docker-compose.yml` sind für einfaches Self-Hosting enthalten.

```bash
# Zuerst das Frontend bauen
npm run build

# Mit Docker Compose bauen und starten
docker compose up -d
```

Die `docker-compose.yml` stellt folgende Ports bereit:
- Port **3099** -> HTTPS (3000 im Container)
- Port **3098** -> HTTP (3001 im Container)

Daten werden im Docker-Volume `foodai-data` persistent gespeichert.

```yaml
services:
  foodai:
    build: .
    container_name: foodai
    restart: unless-stopped
    ports:
      - "3099:3000"
      - "3098:3001"
    volumes:
      - foodai-data:/app/data
    environment:
      - DB_DIR=/app/data
      - NODE_ENV=production

volumes:
  foodai-data:
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

## Unterstützung

Wenn du dieses Projekt nützlich findest, spendier mir einen Kaffee:

[![PayPal](https://img.shields.io/badge/PayPal-Spenden-blue?logo=paypal)](https://www.paypal.com/paypalme/germanquestions)

## Lizenz

Apache-2.0
