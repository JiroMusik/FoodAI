# FoodAI Roadmap

## In Progress
- [ ] **Recipe Import via URL** — Paste a Chefkoch/Instagram/any recipe URL → AI extracts title, ingredients, instructions

## Planned — High Priority
- [ ] **Expiry Notifications** — Push notifications to phone when items expire in 1-2 days (HA integration or Web Push)
- [ ] **Bulk Import via Photo** — Photograph entire grocery haul, AI identifies all products at once
- [ ] **Recipe Search** — Search through favorites and generated recipes
- [ ] **Consumption History** — "You buy milk every 5 days" → auto-suggest shopping list
- [ ] **HA Voice Integration** — REST API endpoint for voice queries ("Was läuft bald ab?"), HA automation calls endpoint, writes response to entity, voice assistant reads it

## Planned — Medium Priority
- [ ] **Multi-User / Household Sharing** — Multiple users, shared inventory
- [ ] **Weekly Plan → Shopping List** — "What's missing for the entire week?" one-click
- [ ] **Seasonal Recipe Suggestions** — AI considers season, not just inventory
- [ ] **Per-Provider API Keys** — Separate API keys for Gemini, OpenAI, Anthropic (currently shared)

## Nice to Have
- [ ] **Phone Home Screen Widget** — Expiry counter, quick-scan button (PWA shortcut)
- [ ] **Barcode Community DB** — Share unknown barcode lookups with other FoodAI users
- [ ] **Nutrition Tracking** — Calories/macros per recipe from OpenFoodFacts data
- [ ] **Meal Cost Calculator** — Total cost per recipe based on item prices
- [ ] **Inventory Export/Import** — CSV/JSON backup and restore

## Completed
- [x] Per-package inventory tracking
- [x] AI barcode + photo scanning
- [x] Recipe generation (single + weekly)
- [x] Favorite recipes
- [x] Meal calendar with smart deduction
- [x] i18n (DE/EN/ES)
- [x] Dark/Light/Auto/Custom themes
- [x] RSS food inspiration
- [x] Live AI model list
- [x] Security audit (18 findings fixed)
- [x] Price tracking + stock value
- [x] Storage location + min stock warnings
- [x] Mirror display endpoint
