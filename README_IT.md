🌍 [English](README.md) | [Deutsch](README_DE.md) | [Fran&ccedil;ais](README_FR.md) | [Espa&ntilde;ol](README_ES.md) | [Italiano](README_IT.md)

<div align="center">
<img src="foodai_banner.png" alt="FoodAI Banner" width="100%" />
</div>

# FoodAI

Un gestore di inventario cucina self-hosted con scansione di codici a barre tramite IA, generazione di ricette e pianificazione dei pasti. Realizzato con React, Express e SQLite.

## Funzionalità

- **Scanner di codici a barre** -- Scansiona codici a barre EAN/UPC con la fotocamera del telefono. I prodotti vengono cercati tramite OpenFoodFacts e UPCItemDB, poi memorizzati localmente nella cache.
- **Riconoscimento prodotti tramite IA** -- Punta la fotocamera su qualsiasi alimento e lascia che l'IA identifichi il prodotto, la categoria, la quantità e la data di scadenza.
- **Inventario per confezione** -- Ogni confezione fisica viene tracciata individualmente con stato aperto/chiuso, livello di riempimento e dimensione della confezione.
- **Scansione data di scadenza** -- OCR via Tesseract.js con fallback IA per leggere le date di scadenza dalle confezioni.
- **Generazione ricette tramite IA** -- Genera singole ricette o piani settimanali completi basati sul tuo inventario attuale, dando priorità agli articoli in scadenza.
- **Ingredienti extra** -- Opzionalmente consenti all'IA di suggerire un numero limitato di ingredienti che non hai.
- **Ricette preferite** -- Salva e riutilizza le ricette che ti piacciono.
- **Calendario dei pasti** -- Pianifica i pasti per date specifiche, contrassegnali come cucinati e deduci automaticamente gli ingredienti dall'inventario.
- **Deduzione intelligente** -- Durante la cottura, il sistema apre le confezioni secondo necessità e crea articoli di inventario "aperti" con date di scadenza adattate (stimate dall'IA).
- **Lista della spesa** -- Calcola automaticamente gli ingredienti mancanti per i pasti pianificati in arrivo.
- **Modalità cottura libera** -- Fotografa i tuoi ingredienti sul piano di lavoro; l'IA li abbina all'inventario e suggerisce le quantità.
- **Integrazione Bring!** -- Invia gli ingredienti mancanti all'app per la lista della spesa Bring! (segnaposto -- credenziali configurate nell'app).
- **Display specchio** -- Un endpoint autonomo `/mirror/today` con tema scuro che mostra la ricetta del giorno, adatto per l'integrazione su uno specchio intelligente o tablet.
- **Supporto multi-provider IA** -- Passa tra Gemini, OpenAI, Anthropic, DeepSeek, Moonshot o Ollama (locale) direttamente nella pagina Impostazioni.
- **PWA** -- Installabile come Progressive Web App su dispositivi mobili.

## Screenshot

<!-- Aggiungi screenshot qui -->

## Stack tecnologico

| Livello | Tecnologia |
|---------|-----------|
| Frontend | React 19, TypeScript, React Router v7, Tailwind CSS v4, Framer Motion |
| Backend | Node.js, Express, TypeScript (tsx) |
| Database | SQLite via better-sqlite3 |
| Scansione | html5-qrcode, Tesseract.js |
| SDK IA | @google/genai, openai, @anthropic-ai/sdk |
| Build | Vite, vite-plugin-pwa |
| Icone | Lucide React |
| Deployment | Docker, docker-compose |

## Provider IA

Tutti i provider sono configurabili nella pagina Impostazioni dell'app. Puoi impostare la chiave API, selezionare i modelli e scegliere modelli separati per l'IA principale (ricette, scansione) e l'IA consulente (stima quantità, controlli scadenza).

| Provider | Modelli di esempio |
|----------|-------------------|
| Google Gemini | gemini-3-flash-preview, gemini-1.5-pro |
| OpenAI | gpt-4o, gpt-4o-mini |
| Anthropic | claude-3-5-sonnet-latest, claude-3-haiku |
| DeepSeek | deepseek-chat, deepseek-coder |
| Moonshot (Kimi) | moonshot-v1-8k, moonshot-v1-128k |
| Ollama (locale) | llama3, mistral, llava (qualsiasi modello scaricato) |

## Per iniziare

### Prerequisiti

- Node.js 20+ (22 consigliato)
- Una chiave API di almeno un provider IA (il livello gratuito di Gemini funziona)

### Sviluppo locale

```bash
# Installare le dipendenze
npm install

# Creare il file di ambiente
cp .env.example .env.local
# Modifica .env.local e aggiungi la tua GEMINI_API_KEY (o configura altri provider nell'app)

# Avviare il server di sviluppo (Express + Vite HMR)
npm run dev
```

L'app sarà disponibile su:
- **https://localhost:3000** (HTTPS con certificato autofirmato generato automaticamente -- necessario per l'accesso alla fotocamera su mobile)
- **http://localhost:3001** (HTTP per integrazione locale, es. iframe di specchio intelligente)

> Il certificato autofirmato attiverà un avviso del browser alla prima visita. Accettalo per procedere.

### Build di produzione

```bash
npm run build    # Compila il frontend in dist/
npm start        # Avvia il server di produzione
```

## Deployment con Docker

Sono inclusi un `Dockerfile` e un `docker-compose.yml` per un facile deployment self-hosted.

```bash
# Prima compilare il frontend
npm run build

# Costruire e avviare con Docker Compose
docker compose up -d
```

Il `docker-compose.yml` espone:
- Porta **3099** -> HTTPS (3000 nel container)
- Porta **3098** -> HTTP (3001 nel container)

I dati vengono persistiti nel volume Docker `foodai-data`.

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

## Variabili d'ambiente

| Variabile | Obbligatoria | Predefinito | Descrizione |
|-----------|-------------|------------|-------------|
| `GEMINI_API_KEY` | No | -- | Chiave API Gemini predefinita (può essere impostata anche nell'app) |
| `DB_DIR` | No | `./` | Directory per il database SQLite e i certificati SSL |
| `HTTP_PORT` | No | `3001` | Porta per il server HTTP |
| `NODE_ENV` | No | -- | Impostare su `production` per servire il frontend precompilato |

## Struttura del progetto

```
server.ts          Backend Express (route API, integrazione IA, database)
src/
  App.tsx          Configurazione del router React
  main.tsx         Punto di ingresso
  types.ts         Interfacce TypeScript
  pages/
    Dashboard.tsx  Panoramica (articoli in scadenza, confezioni aperte, pasti di oggi)
    Inventory.tsx  Gestione inventario per confezione
    Scanner.tsx    Scanner codici a barre + fotocamera IA
    Recipes.tsx    Generazione ricette tramite IA (singola + settimanale)
    Calendar.tsx   Calendario pianificazione pasti
    FreeCook.tsx   Assistente di cottura libera
    ShoppingList.tsx  Lista della spesa auto-generata
    Settings.tsx   Impostazioni provider IA, modello e integrazioni
  components/
    Navigation.tsx      Barra di navigazione inferiore
    RecipeCard.tsx       Componente di visualizzazione ricetta
    OpenedItemsModal.tsx Modale per regolazioni scadenza articoli aperti
```

## Supporto

Se trovi utile questo progetto, considera di offrirmi un caffè:

[![PayPal](https://img.shields.io/badge/PayPal-Dona-blue?logo=paypal)](https://www.paypal.com/paypalme/germanquestions)

## Licenza

Apache-2.0
