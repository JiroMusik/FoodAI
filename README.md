# FoodAI

A self-hosted kitchen inventory manager with AI-powered barcode scanning, recipe generation, and meal planning. Built with React, Express, and SQLite.

## Features

- **Barcode Scanner** -- Scan EAN/UPC barcodes with your phone camera. Products are looked up via OpenFoodFacts and UPCItemDB, then cached locally.
- **AI Product Recognition** -- Point the camera at any food item and let AI identify the product, category, quantity, and expiry date.
- **Per-Package Inventory** -- Each physical package is tracked individually with open/closed status, fill level, and package size.
- **Expiry (MHD) Scanning** -- OCR via Tesseract.js with AI fallback to read best-before dates from packaging.
- **AI Recipe Generation** -- Generate single recipes or full weekly meal plans based on your current inventory, prioritizing items that expire soon.
- **Extra Ingredients Toggle** -- Optionally allow the AI to suggest a limited number of ingredients you do not have.
- **Favorite Recipes** -- Save and reuse recipes you like.
- **Meal Calendar** -- Plan meals for specific dates, mark them as cooked, and automatically deduct ingredients from inventory.
- **Smart Deduction** -- When cooking, the system opens packages as needed and creates "opened" inventory items with adjusted expiry dates (AI-estimated).
- **Shopping List** -- Automatically calculates missing ingredients for upcoming planned meals.
- **Free Cook Mode** -- Photograph your ingredients on the counter; AI matches them to inventory and suggests amounts.
- **Bring! Integration** -- Send missing ingredients to the Bring! shopping list app (placeholder -- credentials configured in-app).
- **Mirror Display** -- A standalone dark-themed `/mirror/today` endpoint showing today's recipe, suitable for embedding on a smart mirror or tablet.
- **Multi-AI Provider Support** -- Switch between Gemini, OpenAI, Anthropic, DeepSeek, Moonshot, or Ollama (local) directly in the Settings page.
- **PWA** -- Installable as a Progressive Web App on mobile devices.

## Screenshots

<!-- Add screenshots here -->

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, React Router v7, Tailwind CSS v4, Framer Motion |
| Backend | Node.js, Express, TypeScript (tsx) |
| Database | SQLite via better-sqlite3 |
| Scanning | html5-qrcode, Tesseract.js |
| AI SDKs | @google/genai, openai, @anthropic-ai/sdk |
| Build | Vite, vite-plugin-pwa |
| Icons | Lucide React |
| Deployment | Docker, docker-compose |

## AI Providers

All providers are configurable in the in-app Settings page. You can set the API key, select models, and pick separate models for the main AI (recipes, scanning) and the advisor AI (amount estimation, expiry checks).

| Provider | Example Models |
|----------|---------------|
| Google Gemini | gemini-3-flash-preview, gemini-1.5-pro |
| OpenAI | gpt-4o, gpt-4o-mini |
| Anthropic | claude-3-5-sonnet-latest, claude-3-haiku |
| DeepSeek | deepseek-chat, deepseek-coder |
| Moonshot (Kimi) | moonshot-v1-8k, moonshot-v1-128k |
| Ollama (local) | llama3, mistral, llava (any model you have pulled) |

## Getting Started

### Prerequisites

- Node.js 20+ (22 recommended)
- An API key from at least one AI provider (Gemini free tier works)

### Local Development

```bash
# Install dependencies
npm install

# Create your environment file
cp .env.example .env.local
# Edit .env.local and add your GEMINI_API_KEY (or configure other providers in-app)

# Start the development server (Express + Vite HMR)
npm run dev
```

The app will be available at:
- **https://localhost:3000** (HTTPS with auto-generated self-signed certificate -- required for camera access on mobile)
- **http://localhost:3001** (HTTP for local embedding, e.g. smart mirror iframes)

> The self-signed certificate will trigger a browser warning on first visit. Accept it to proceed.

### Production Build

```bash
npm run build    # Builds the frontend into dist/
npm start        # Starts the production server
```

## Docker Deployment

A `Dockerfile` and `docker-compose.yml` are included for easy self-hosted deployment.

```bash
# Build the frontend first
npm run build

# Build and start with Docker Compose
docker compose up -d
```

The `docker-compose.yml` exposes:
- Port **3099** -> HTTPS (3000 inside container)
- Port **3098** -> HTTP (3001 inside container)

Data is persisted in the `foodai-data` Docker volume.

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

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | No | -- | Default Gemini API key (can also be set in-app) |
| `DB_DIR` | No | `./` | Directory for SQLite database and SSL certificates |
| `HTTP_PORT` | No | `3001` | Port for the plain HTTP server |
| `NODE_ENV` | No | -- | Set to `production` to serve pre-built frontend |

## Project Structure

```
server.ts          Express backend (API routes, AI integration, database)
src/
  App.tsx          React router configuration
  main.tsx         Entry point
  types.ts         TypeScript interfaces
  pages/
    Dashboard.tsx  Overview (expiring items, open packages, today's meals)
    Inventory.tsx  Per-package inventory management
    Scanner.tsx    Barcode + AI camera scanner
    Recipes.tsx    AI recipe generation (single + weekly)
    Calendar.tsx   Meal planning calendar
    FreeCook.tsx   Free-form cooking assistant
    ShoppingList.tsx  Auto-generated shopping list
    Settings.tsx   AI provider, model, and integration settings
  components/
    Navigation.tsx      Bottom navigation bar
    RecipeCard.tsx       Recipe display component
    OpenedItemsModal.tsx Modal for opened-item expiry adjustments
```

## Support

If you find this project useful, consider buying me a coffee:

[![PayPal](https://img.shields.io/badge/PayPal-Donate-blue?logo=paypal)](https://www.paypal.com/paypalme/germanquestions)

## License

Apache-2.0
