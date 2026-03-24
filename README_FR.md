🌍 [English](README.md) | [Deutsch](README_DE.md) | [Fran&ccedil;ais](README_FR.md) | [Espa&ntilde;ol](README_ES.md) | [Italiano](README_IT.md)

# FoodAI

Un gestionnaire d'inventaire de cuisine auto-hébergé avec scan de codes-barres par IA, génération de recettes et planification de repas. Construit avec React, Express et SQLite.

## Fonctionnalités

- **Scanner de codes-barres** -- Scannez les codes-barres EAN/UPC avec l'appareil photo de votre téléphone. Les produits sont recherchés via OpenFoodFacts et UPCItemDB, puis mis en cache localement.
- **Reconnaissance de produits par IA** -- Pointez l'appareil photo vers n'importe quel aliment et laissez l'IA identifier le produit, la catégorie, la quantité et la date de péremption.
- **Inventaire par emballage** -- Chaque emballage physique est suivi individuellement avec son statut ouvert/fermé, son niveau de remplissage et la taille du paquet.
- **Scan de dates de péremption** -- OCR via Tesseract.js avec repli IA pour lire les dates de péremption sur les emballages.
- **Génération de recettes par IA** -- Générez des recettes individuelles ou des plans de repas hebdomadaires complets basés sur votre inventaire actuel, en priorisant les articles qui expirent bientôt.
- **Ingrédients supplémentaires** -- Autorisez optionnellement l'IA à suggérer un nombre limité d'ingrédients que vous n'avez pas.
- **Recettes favorites** -- Sauvegardez et réutilisez les recettes que vous aimez.
- **Calendrier des repas** -- Planifiez des repas pour des dates spécifiques, marquez-les comme cuisinés et déduisez automatiquement les ingrédients de l'inventaire.
- **Déduction intelligente** -- Lors de la cuisson, le système ouvre les paquets selon les besoins et crée des articles d'inventaire "ouverts" avec des dates de péremption ajustées (estimées par IA).
- **Liste de courses** -- Calcule automatiquement les ingrédients manquants pour les repas planifiés à venir.
- **Mode cuisson libre** -- Photographiez vos ingrédients sur le plan de travail ; l'IA les fait correspondre à l'inventaire et suggère des quantités.
- **Intégration Bring!** -- Envoyez les ingrédients manquants vers l'application de liste de courses Bring! (espace réservé -- identifiants configurés dans l'application).
- **Affichage miroir** -- Un endpoint autonome `/mirror/today` au thème sombre affichant la recette du jour, adapté à l'intégration sur un miroir connecté ou une tablette.
- **Support multi-fournisseurs IA** -- Basculez entre Gemini, OpenAI, Anthropic, DeepSeek, Moonshot ou Ollama (local) directement dans la page Paramètres.
- **PWA** -- Installable en tant que Progressive Web App sur les appareils mobiles.

## Captures d'écran

<!-- Ajoutez des captures d'écran ici -->

## Stack technique

| Couche | Technologie |
|--------|------------|
| Frontend | React 19, TypeScript, React Router v7, Tailwind CSS v4, Framer Motion |
| Backend | Node.js, Express, TypeScript (tsx) |
| Base de données | SQLite via better-sqlite3 |
| Scan | html5-qrcode, Tesseract.js |
| SDKs IA | @google/genai, openai, @anthropic-ai/sdk |
| Build | Vite, vite-plugin-pwa |
| Icônes | Lucide React |
| Déploiement | Docker, docker-compose |

## Fournisseurs IA

Tous les fournisseurs sont configurables dans la page Paramètres de l'application. Vous pouvez définir la clé API, sélectionner les modèles et choisir des modèles distincts pour l'IA principale (recettes, scan) et l'IA conseillère (estimation des quantités, vérifications de péremption).

| Fournisseur | Modèles exemples |
|-------------|-----------------|
| Google Gemini | gemini-3-flash-preview, gemini-1.5-pro |
| OpenAI | gpt-4o, gpt-4o-mini |
| Anthropic | claude-3-5-sonnet-latest, claude-3-haiku |
| DeepSeek | deepseek-chat, deepseek-coder |
| Moonshot (Kimi) | moonshot-v1-8k, moonshot-v1-128k |
| Ollama (local) | llama3, mistral, llava (tout modèle que vous avez téléchargé) |

## Démarrage

### Prérequis

- Node.js 20+ (22 recommandé)
- Une clé API d'au moins un fournisseur IA (le niveau gratuit Gemini fonctionne)

### Développement local

```bash
# Installer les dépendances
npm install

# Créer votre fichier d'environnement
cp .env.example .env.local
# Éditez .env.local et ajoutez votre GEMINI_API_KEY (ou configurez d'autres fournisseurs dans l'app)

# Démarrer le serveur de développement (Express + Vite HMR)
npm run dev
```

L'application sera disponible sur :
- **https://localhost:3000** (HTTPS avec certificat auto-signé généré automatiquement -- requis pour l'accès caméra sur mobile)
- **http://localhost:3001** (HTTP pour l'intégration locale, par ex. iframes de miroir connecté)

> Le certificat auto-signé déclenchera un avertissement du navigateur lors de la première visite. Acceptez-le pour continuer.

### Build de production

```bash
npm run build    # Compile le frontend dans dist/
npm start        # Démarre le serveur de production
```

## Déploiement Docker

Un `Dockerfile` et un `docker-compose.yml` sont inclus pour un déploiement auto-hébergé facile.

```bash
# Compiler d'abord le frontend
npm run build

# Construire et démarrer avec Docker Compose
docker compose up -d
```

Le `docker-compose.yml` expose :
- Port **3099** -> HTTPS (3000 dans le conteneur)
- Port **3098** -> HTTP (3001 dans le conteneur)

Les données sont conservées dans le volume Docker `foodai-data`.

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

## Variables d'environnement

| Variable | Requis | Par défaut | Description |
|----------|--------|-----------|-------------|
| `GEMINI_API_KEY` | Non | -- | Clé API Gemini par défaut (peut aussi être définie dans l'app) |
| `DB_DIR` | Non | `./` | Répertoire pour la base de données SQLite et les certificats SSL |
| `HTTP_PORT` | Non | `3001` | Port pour le serveur HTTP |
| `NODE_ENV` | Non | -- | Définir sur `production` pour servir le frontend pré-compilé |

## Structure du projet

```
server.ts          Backend Express (routes API, intégration IA, base de données)
src/
  App.tsx          Configuration du routeur React
  main.tsx         Point d'entrée
  types.ts         Interfaces TypeScript
  pages/
    Dashboard.tsx  Vue d'ensemble (articles expirants, paquets ouverts, repas du jour)
    Inventory.tsx  Gestion d'inventaire par emballage
    Scanner.tsx    Scanner de codes-barres + caméra IA
    Recipes.tsx    Génération de recettes par IA (simple + hebdomadaire)
    Calendar.tsx   Calendrier de planification des repas
    FreeCook.tsx   Assistant de cuisson libre
    ShoppingList.tsx  Liste de courses auto-générée
    Settings.tsx   Paramètres fournisseur IA, modèle et intégrations
  components/
    Navigation.tsx      Barre de navigation inférieure
    RecipeCard.tsx       Composant d'affichage de recette
    OpenedItemsModal.tsx Modal pour les ajustements de péremption des articles ouverts
```

## Soutien

Si vous trouvez ce projet utile, offrez-moi un café :

[![PayPal](https://img.shields.io/badge/PayPal-Don-blue?logo=paypal)](https://www.paypal.com/paypalme/germanquestions)

## Licence

Apache-2.0
