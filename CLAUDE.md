# FoodAI — Project Guide

## Overview
Self-hosted kitchen inventory manager with AI-powered barcode scanning, recipe generation, and meal planning. React 19 frontend + Express/SQLite backend.

## Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Framer Motion, react-i18next
- **Backend**: Express, tsx (TypeScript runtime), better-sqlite3
- **AI**: Multi-provider (Gemini, OpenAI, Anthropic, DeepSeek, Moonshot, Ollama)
- **Scanning**: html5-qrcode (barcode), Tesseract.js (MHD/OCR)
- **Docker**: node:22-slim, non-root `node` user (UID 1000), multi-arch (amd64+arm64)

## Build & Deploy Workflow

### Development (Windows)
```bash
npm install          # Install dependencies
npm run dev          # Dev server (Express + Vite HMR)
npm run build        # Production build → dist/
```

### Deployment (Pi via Docker)
```bash
# 1. Build on Windows
npm run build

# 2. Commit + push + tag
git add -A && git commit -m "description"
git push origin main
git tag vX.Y.Z && git push origin vX.Y.Z

# 3. GitHub Actions builds multi-arch Docker image → ghcr.io/jiromusik/foodai:latest

# 4. On Pi: pull and restart
cd /home/n3lson/foodai
docker compose pull
docker compose up -d
```

**NEVER** build Docker images locally on the Pi. Always use the ghcr.io pre-built image.
**NEVER** use `docker cp` for deployment. Always commit → push → pull image.
**NEVER** delete Docker volumes — they contain the SQLite database with all user data.

### Quick hotfix (server.ts only, no new dependencies)
If only server.ts changed and no new npm packages were added, you can `docker cp` the file:
```bash
docker cp server.ts foodai:/app/server.ts && docker restart foodai
```
But this is a temporary measure — always follow up with a proper commit + image build.

## Key File Locations
```
server.ts                    # Express backend (API, AI, database, all endpoints)
ingredient-aliases.json      # 193 items, 1499 aliases for recipe matching
src/
  i18n/locales/              # de.json, en.json, es.json (~280 keys each)
  pages/                     # Dashboard, Inventory, Scanner, Recipes, Calendar, FreeCook, Settings, ShoppingList
  components/                # Navigation, RecipeCard, OpenedItemsModal
  data/ingredient-aliases.json  # Source copy of alias map
Dockerfile                   # Multi-stage build, node:22-slim, non-root
docker-compose.yml           # Production: ghcr.io image, volume for data
.github/workflows/           # CI/CD: multi-arch Docker build on tag push
```

## Known Quirks
- **ESM + tsx**: `__dirname` is undefined. Use `process.cwd()` instead.
- **better-sqlite3**: Needs native compilation. Works in Docker (node:22-slim has build tools).
- **html5-qrcode**: Manages its own camera stream. Don't mix with react-webcam simultaneously.
- **ingredient-aliases.json**: Must be at `/app/ingredient-aliases.json` in the container. Loaded once at startup.
- **API keys in Settings**: Masked with `••••••••` on GET. The bulk-save endpoint skips masked values to prevent overwriting real keys.
- **Self-signed HTTPS**: Auto-generated on first start. Required for camera access on mobile.

## Security
- **No authentication** by design (trusted LAN only)
- Rate limiting on all AI endpoints (10 req/min/IP)
- XSS protection on /mirror/today (escapeHtml on all dynamic values)
- SSRF protection on Ollama URL (blocks metadata IPs)
- Secrets masked in API responses
- Docker: non-root `node` user (UID 1000)
- Settings key allowlist prevents arbitrary DB pollution

## Code Conventions
- i18n: All user-facing strings via `t('key')` from react-i18next
- Categories stored as German strings in DB, translated via i18n on display
- Ingredient matching: use the `matchRecipeIngredients()` function, never inline
- AI prompts: instructions in English, output language parameterized
- CSS: Tailwind utility classes, dark mode via `html.dark` class
- No `console.log` with sensitive data (API keys, passwords)
