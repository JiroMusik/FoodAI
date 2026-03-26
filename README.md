# 🍎 FoodAI v2.0.0

**Master your inventory. Discover your next meal.**

FoodAI is a self-hosted, AI-first kitchen inventory manager. Version 2.0.0 introduces a modern, modular architecture with separated services, custom hooks, and a decoupled backend for improved performance and maintainability.

[![PayPal](https://img.shields.io/badge/PayPal-Donate-blue?logo=paypal)](https://www.paypal.com/paypalme/germanquestions)

---

## ⚠️ Security Notice
FoodAI has **no built-in authentication**. It is designed for trusted local networks only. Do NOT expose it to the public internet without adding a reverse proxy with authentication (e.g., Authelia, Authentik, or HTTP Basic Auth via Caddy/nginx).

---

## ✨ Core Pillars (v2.0 Architecture)

### 📸 Zero-Friction Inventory
Forget manual data entry. Use **Vision Scan** to identify products and automatically extract expiry dates (MHD) directly from packaging. Our refactored **AI Service** handles multi-provider logic (Gemini, OpenAI, Anthropic, Ollama) with robust error handling.

### 👨‍🍳 Generative Culinary Intelligence
FoodAI doesn't just list your food — it understands it. The **Generative Chef** analyzes your current stock and creates custom recipes and weekly meal plans. The v2.0 update includes a new **Mathematical Deduction Engine** for precise inventory tracking.

### 📱 Premium Mobile Experience (PWA)
Built for the modern kitchen. Fully installable **Progressive Web App** with smooth animations (Framer Motion) and a mobile-first UI. The frontend has been refactored into modular components and custom hooks (`useInventory`, `useCalendar`) for a snappy user experience.

---

## 🚀 Features

- **Smart Dashboard** — Real-time overview of stock value, expiring items, and today's planned meals
- **Automatic Bring! Sync** — One-way background synchronization to your Bring! list
- **Bulk Management** — Move or delete multiple inventory items at once
- **AI Barcode & Image Recognition** — Scan EAN/UPC barcodes or photograph any product
- **Per-Package Inventory** — Each physical package tracked individually
- **AI Recipe Generation** — Single recipes or full weekly meal plans with custom portions per day
- **Storage Location Tracking** — Organize items by Fridge, Freezer, Pantry, etc.
- **Minimum Stock Warnings** — Automatic shopping list additions for staples
- **RSS Food Inspiration** — Daily recipe ideas from top food blogs

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Framer Motion |
| State | Custom React Hooks + Centralized API Client |
| Backend | Node.js, Express, Modular Service Architecture |
| Database | SQLite via better-sqlite3 with Automated Migrations |
| AI SDKs | @google/genai, openai, @anthropic-ai/sdk |
| CI/CD | GitHub Actions (Auto-building multi-arch Docker images) |

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

---

## 🐳 Docker & CI/CD

FoodAI uses **GitHub Actions** to automatically build and push multi-arch Docker images (`amd64` and `arm64`) to the GitHub Container Registry. This ensures a seamless experience on both standard servers and Raspberry Pi devices.

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
```

---

## 📁 Modular Project Structure (v2.0)

```
server.ts              Express application setup
server/
  db/                  Database connection & migrations
  services/            AI, Bring!, and Prompt management
  utils/               Unit conversions & category mapping
src/
  api/                 Centralized API client
  hooks/               Business logic hooks (useInventory, useCalendar)
  components/          Modular UI components (inventory, recipes)
  pages/               Dashboard, Inventory, Scanner, etc.
Dockerfile             Multi-stage build
.github/workflows/     Automated CI/CD build process
```

