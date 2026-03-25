# FoodAI Launch Posts

## Reddit — r/selfhosted

**Title:** I built a self-hosted kitchen inventory manager with AI barcode scanning and recipe generation

**Body:**

Hey everyone! I've been working on **FoodAI** — a self-hosted kitchen inventory manager that uses AI to make food management actually effortless.

**The problem:** I was tired of forgetting what's in my fridge, throwing away expired food, and never knowing what to cook with what I have.

**What it does:**
- 📸 Scan barcodes or take a photo — AI identifies the product, quantity, category, and expiry date
- 🍽️ AI generates recipes based on what you actually have, prioritizing stuff that's about to expire
- 📦 Tracks each physical package individually (open/closed, fill level, storage location)
- 📅 Weekly meal planning with automatic ingredient deduction
- 🛒 Auto-generated shopping list + Bring! integration
- 🌍 Multilingual (DE/EN/ES)
- 🎨 Light/Dark/Auto/Custom themes
- 🔒 Self-hosted, your data stays with you

**Tech:** React 19, Express, SQLite, Tailwind CSS. Works with Gemini, OpenAI, Anthropic, or local Ollama — you pick your AI provider in-app.

**Docker one-liner:**
```
docker compose up -d
```
Multi-arch images (amd64 + arm64) on ghcr.io — runs on your Pi, NAS, or server.

GitHub: https://github.com/JiroMusik/FoodAI

Would love feedback! What features would you want in something like this?

---

## Reddit — r/homelab

**Title:** Self-hosted AI kitchen inventory manager — runs on a Pi, scans barcodes, generates recipes from your stock

**Body:**

Built this for my Raspberry Pi 5 setup. It's a kitchen inventory app that uses AI to scan products and suggest recipes based on what you have.

**Quick facts:**
- Docker image on ghcr.io (amd64 + arm64)
- SQLite database, no external DB needed
- Self-signed HTTPS auto-generated (needed for phone camera access)
- ~200MB image, runs fine on a Pi 5
- Multi-AI: Gemini (free tier works), OpenAI, Anthropic, or local Ollama
- Rate limited, non-root container, no auth by design (trusted LAN only)

It integrates with my MagicMirror — there's a `/mirror/today` endpoint that shows today's recipe on a dark display.

GitHub: https://github.com/JiroMusik/FoodAI

---

## Hacker News — Show HN

**Title:** Show HN: FoodAI – Self-hosted kitchen inventory with AI barcode scanning and recipe generation

**Body:**

FoodAI is a self-hosted kitchen inventory manager. Point your phone camera at a product — AI identifies it. Scan a barcode — it looks up OpenFoodFacts. The app tracks each physical package (open/closed, fill level, expiry), generates recipes from your current stock, and creates weekly meal plans.

Built with React 19, Express, SQLite. Supports Gemini, OpenAI, Anthropic, and local Ollama. Docker images for amd64 and arm64.

No cloud dependency, no account needed, your data stays on your machine.

https://github.com/JiroMusik/FoodAI

---

## Product Hunt

**Tagline:** Master your inventory. Discover your next meal.

**Description:**

FoodAI turns your phone into an AI-powered kitchen assistant. Scan barcodes, photograph products, and let AI handle the rest — from identifying items to generating recipes based on what's about to expire.

Self-hosted. Works with any AI provider (Gemini, OpenAI, Claude, Ollama). Runs anywhere Docker runs.

**Topics:** Artificial Intelligence, Kitchen, Self-Hosted, Open Source, Food & Drink

---

## Twitter/X

Shipping FoodAI — a self-hosted kitchen inventory manager powered by AI.

📸 Scan a barcode or snap a photo
🧠 AI identifies product, quantity, expiry
🍽️ Generates recipes from your stock
📦 Tracks every package (open/closed, fill level)
🐳 Docker on Pi, NAS, or server

Open source: github.com/JiroMusik/FoodAI

---

## Dev.to / Hashnode (Blog Post Outline)

**Title:** How I Built an AI Kitchen Inventory Manager That Actually Works

**Sections:**
1. The Problem — food waste, forgotten items, "what should I cook?"
2. The Solution — scan, track, cook
3. Architecture — React + Express + SQLite + multi-AI
4. The Barcode Scanner Journey — from Quagga2 to html5-qrcode to native BarcodeDetector
5. Per-Package Tracking — why "1 Packung" doesn't work
6. Recipe Generation — teaching AI to cook with constraints
7. Self-Hosting with Docker — multi-arch, non-root, auto-HTTPS
8. What's Next — voice control, HA integration, community translations
