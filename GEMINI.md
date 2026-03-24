# FoodAI Project Overview

## Project Description
FoodAI is a full-stack web application designed to manage food inventory, assist with meal planning, and suggest recipes using AI. It features a React frontend and an Express backend, utilizing SQLite for local data storage.

### Key Features
- **Inventory Management**: Tracks food items, their quantities, units, and expiry dates.
- **Barcode Scanning**: Looks up products using local databases or external APIs (OpenFoodFacts, UPCItemDB).
- **AI Integration**: Connects to various AI models (Gemini, OpenAI, Anthropic, Ollama) to analyze food images, suggest recipes based on available inventory, and help with meal planning.
- **Recipe & Calendar**: Plans meals for the week based on current stock.
- **Free Cook**: Assists the user while cooking, intelligently deducting used ingredients from the inventory.

## Architecture and Technologies
- **Frontend**: React 19, React Router v7, TailwindCSS v4, Vite.
- **Backend**: Node.js with Express, running alongside Vite during development.
- **Database**: SQLite (`better-sqlite3`), storing data in `inventory.db`.
- **AI SDKs**: `@google/genai`, `openai`, `@anthropic-ai/sdk`.
- **Utilities**: `html5-qrcode` and `jsqr` for scanning, `lucide-react` for icons.

## Directory Structure
- `src/`: Contains the React frontend code (Components, Pages).
- `src/App.tsx`: The main router configuration for the frontend app.
- `server.ts`: The Express backend application, handling API routes and database interactions.
- `vite.config.ts`: Vite configuration for building and serving the frontend.
- `package.json`: Project dependencies and npm scripts.

## Building and Running
The application uses `tsx` to run the TypeScript server, which in turn serves the Vite frontend.
- **Install dependencies**: `npm install`
- **Run in development**: `npm run dev` or `npm start`. This starts the Express server and Vite in middleware mode.
- **Build**: `npm run build`
- **Environment Variables**: Create a `.env.local` or `.env` file and set your `GEMINI_API_KEY` (and other AI provider keys if needed).

*Note: The server automatically generates a self-signed SSL certificate (`server.key`, `server.cert`) to serve the app over HTTPS, which is required for mobile devices to access the camera for barcode/image scanning.*

## Development Conventions
- **TypeScript**: Both frontend and backend are written in TypeScript.
- **Styling**: TailwindCSS is used for utility-first styling.
- **State Management**: React state and contexts are likely used. The backend serves mostly as a REST API that the frontend fetches data from.
- **AI Integration**: AI logic is primarily handled in the backend (`server.ts`) to keep API keys secure and centralized. The frontend sends images or prompts to the backend API.
