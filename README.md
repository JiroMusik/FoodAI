🌍 [English](README.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | [Italiano](README_IT.md)

<div align="center">
<img src="foodai_banner.png" alt="FoodAI Banner" width="100%" />
</div>

# 🍎 FoodAI

**Master your inventory. Discover your next meal.**

FoodAI is a self-hosted, AI-first kitchen inventory manager. It combines barcode scanning, computer vision, and generative AI to eliminate the friction of kitchen management — turning your pantry into an interactive culinary assistant.

[![PayPal](https://img.shields.io/badge/PayPal-Donate-blue?logo=paypal)](https://www.paypal.com/paypalme/germanquestions)

---

## ✨ Core Pillars

### 📸 Zero-Friction Inventory
Forget manual data entry. Use **Vision Scan** to identify products and automatically extract expiry dates (MHD) directly from packaging. Whether it's a barcode lookup or a photo, the AI handles the logging.

### 👨‍🍳 Generative Culinary Intelligence
FoodAI doesn't just list your food — it understands it. The **Generative Chef** analyzes your current stock and creates custom recipes and weekly meal plans tailored to what you have, prioritizing items nearing expiry.

### 📱 Premium Mobile Experience (PWA)
Built for the modern kitchen. Fully installable **Progressive Web App** with smooth animations (Framer Motion) and a mobile-first UI that feels native on any device.

---

## 🚀 Features

- **Smart Dashboard** — Real-time overview of expiring items, opened packages, and today's planned meals
- **AI Barcode & Image Recognition** — Scan EAN/UPC barcodes or photograph any product for instant identification
- **Per-Package Inventory** — Each physical package tracked individually with open/closed status and fill level
- **Expiry (MHD) Scanning** — OCR via Tesseract.js with AI fallback to read best-before dates
- **AI Recipe Generation** — Single recipes or full weekly meal plans from your inventory
- **Extra Ingredients Toggle** — Optionally allow AI to suggest items you don't have
- **Favorite Recipes** — Save and reuse recipes without adding to calendar
- **Meal Calendar** — Plan meals, mark as cooked, auto-deduct ingredients
- **Smart Deduction** — Opens packages as needed, adjusts remaining amounts
- **Shopping List** — Auto-calculates missing ingredients for planned meals
- **Free Cook Mode** — Photograph ingredients on the counter, AI matches to inventory
- **Bring! Integration** — Send missing ingredients to the Bring! shopping list app
- **Mirror Display** — Dark-themed `/mirror/today` endpoint for smart mirror embedding
- **Multi-Language** — German, English, Spanish (more via community contributions)
- **Multi-AI Provider** — Switch providers in-app, no restart needed

---

## 🧠 AI Providers

All configurable in the Settings page — API key, model selection, separate advisor model for cost optimization.

| Provider | Notes |
|----------|-------|
| Google Gemini | Any model (e.g. Gemini 2.5 Flash/Pro). Enter model ID in Settings. |
| OpenAI | Any model (e.g. GPT-4o, o1). Enter model ID in Settings. |
| Anthropic | Any model (e.g. Claude Opus 4.6, Sonnet). Enter model ID in Settings. |
| DeepSeek | Any model (e.g. deepseek-chat). Enter model ID in Settings. |
| Moonshot (Kimi) | Any model. Enter model ID in Settings. |
| Ollama (local) | Any locally pulled model (llama3, mistral, llava, etc.) |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Framer Motion |
| Backend | Node.js, Express, TypeScript (tsx) |
| Database | SQLite via better-sqlite3 |
| Scanning | html5-qrcode, Tesseract.js |
| AI SDKs | @google/genai, openai, @anthropic-ai/sdk |
| Build | Vite 6, vite-plugin-pwa |
| i18n | react-i18next |
| Deployment | Docker (multi-arch: amd64 + arm64) |

---

## 🚀 Quick Start

### Docker (recommended)

```bash
# 1. Clone
git clone https://github.com/JiroMusik/FoodAI.git
cd FoodAI

# 2. Configure
cp .env.example .env

# 3. Run
docker compose up -d
```

Open **https://localhost:3000** and configure your AI provider in Settings.

### Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

---

## 🐳 Docker

Pre-built multi-arch images (amd64 + arm64) are published to GitHub Container Registry on every release.

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

FoodAI requires HTTPS for camera access on mobile. A self-signed certificate is auto-generated on first start. Accept the browser warning once, or mount your own certificates:

```yaml
volumes:
  - ./certs/cert.pem:/app/data/server.cert:ro
  - ./certs/key.pem:/app/data/server.key:ro
```

---

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | No | — | Default Gemini API key (can also be set in-app) |
| `DB_DIR` | No | `./` | Directory for SQLite database and SSL certificates |
| `HTTP_PORT` | No | `3001` | Port for plain HTTP server (for iframe embedding) |
| `NODE_ENV` | No | — | Set to `production` to serve pre-built frontend |

---

## 🌍 Contributing Translations

FoodAI uses [react-i18next](https://react.i18next.com/). Translation files are in `src/i18n/locales/`.

To add a new language:

1. Copy `src/i18n/locales/en.json` to `src/i18n/locales/xx.json`
2. Translate all values (keep keys in English)
3. Add the import in `src/i18n/i18n.ts`
4. Add the language option to `src/pages/Settings.tsx`
5. Submit a PR!

---

## 📁 Project Structure

```
server.ts              Express backend (API, AI, database)
src/
  i18n/                Internationalization
    locales/           de.json, en.json, es.json
  pages/               Dashboard, Inventory, Scanner, Recipes, Calendar, FreeCook, Settings, ShoppingList
  components/          Navigation, RecipeCard, OpenedItemsModal
Dockerfile             Multi-stage Docker build
docker-compose.yml     Production deployment
.github/workflows/     CI/CD for multi-arch Docker images
```

---

## 📄 License

Apache-2.0 — see [LICENSE](LICENSE)

---

<div align="center">

**Built with ❤️ and AI**

[![PayPal](https://img.shields.io/badge/Buy_me_a_coffee-PayPal-blue?logo=paypal)](https://www.paypal.com/paypalme/germanquestions)

</div>
