🌍 [English](README.md) | [Deutsch](README_DE.md) | [Fran&ccedil;ais](README_FR.md) | [Espa&ntilde;ol](README_ES.md) | [Italiano](README_IT.md)

<div align="center">
<img src="foodai_banner.png" alt="FoodAI Banner" width="100%" />
</div>

# FoodAI

Un gestor de inventario de cocina autoalojado con escaneo de códigos de barras con IA, generación de recetas y planificación de comidas. Construido con React, Express y SQLite.

## Características

- **Escáner de códigos de barras** -- Escanea códigos de barras EAN/UPC con la cámara de tu teléfono. Los productos se buscan en OpenFoodFacts y UPCItemDB, y luego se almacenan en caché localmente.
- **Reconocimiento de productos con IA** -- Apunta la cámara a cualquier alimento y deja que la IA identifique el producto, la categoría, la cantidad y la fecha de caducidad.
- **Inventario por paquete** -- Cada paquete físico se rastrea individualmente con estado abierto/cerrado, nivel de llenado y tamaño del paquete.
- **Escaneo de fecha de caducidad** -- OCR via Tesseract.js con respaldo de IA para leer fechas de consumo preferente de los envases.
- **Generación de recetas con IA** -- Genera recetas individuales o planes de comidas semanales completos basados en tu inventario actual, priorizando los artículos que caducan pronto.
- **Ingredientes adicionales** -- Opcionalmente permite que la IA sugiera un número limitado de ingredientes que no tienes.
- **Recetas favoritas** -- Guarda y reutiliza las recetas que te gustan.
- **Calendario de comidas** -- Planifica comidas para fechas específicas, márcalas como cocinadas y deduce automáticamente los ingredientes del inventario.
- **Deducción inteligente** -- Al cocinar, el sistema abre paquetes según sea necesario y crea artículos de inventario "abiertos" con fechas de caducidad ajustadas (estimadas por IA).
- **Lista de compras** -- Calcula automáticamente los ingredientes faltantes para las comidas planificadas próximas.
- **Modo cocina libre** -- Fotografía tus ingredientes sobre la encimera; la IA los compara con el inventario y sugiere cantidades.
- **Integración con Bring!** -- Envía ingredientes faltantes a la app de lista de compras Bring! (marcador de posición -- credenciales configuradas en la app).
- **Pantalla espejo** -- Un endpoint independiente `/mirror/today` con tema oscuro que muestra la receta del día, adecuado para incrustar en un espejo inteligente o tableta.
- **Soporte multi-proveedor de IA** -- Cambia entre Gemini, OpenAI, Anthropic, DeepSeek, Moonshot u Ollama (local) directamente en la página de Ajustes.
- **PWA** -- Instalable como Progressive Web App en dispositivos móviles.

## Capturas de pantalla

<!-- Añade capturas de pantalla aquí -->

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19, TypeScript, React Router v7, Tailwind CSS v4, Framer Motion |
| Backend | Node.js, Express, TypeScript (tsx) |
| Base de datos | SQLite via better-sqlite3 |
| Escaneo | html5-qrcode, Tesseract.js |
| SDKs de IA | @google/genai, openai, @anthropic-ai/sdk |
| Build | Vite, vite-plugin-pwa |
| Iconos | Lucide React |
| Despliegue | Docker, docker-compose |

## Proveedores de IA

Todos los proveedores son configurables en la página de Ajustes de la aplicación. Puedes establecer la clave API, seleccionar modelos y elegir modelos separados para la IA principal (recetas, escaneo) y la IA asesora (estimación de cantidades, verificación de caducidad).

| Proveedor | Modelos de ejemplo |
|-----------|-------------------|
| Google Gemini | gemini-3-flash-preview, gemini-1.5-pro |
| OpenAI | gpt-4o, gpt-4o-mini |
| Anthropic | claude-3-5-sonnet-latest, claude-3-haiku |
| DeepSeek | deepseek-chat, deepseek-coder |
| Moonshot (Kimi) | moonshot-v1-8k, moonshot-v1-128k |
| Ollama (local) | llama3, mistral, llava (cualquier modelo que hayas descargado) |

## Primeros pasos

### Requisitos previos

- Node.js 20+ (22 recomendado)
- Una clave API de al menos un proveedor de IA (el nivel gratuito de Gemini funciona)

### Desarrollo local

```bash
# Instalar dependencias
npm install

# Crear tu archivo de entorno
cp .env.example .env.local
# Edita .env.local y añade tu GEMINI_API_KEY (o configura otros proveedores en la app)

# Iniciar el servidor de desarrollo (Express + Vite HMR)
npm run dev
```

La aplicación estará disponible en:
- **https://localhost:3000** (HTTPS con certificado autofirmado generado automáticamente -- necesario para el acceso a la cámara en móviles)
- **http://localhost:3001** (HTTP para incrustación local, p.ej. iframes de espejo inteligente)

> El certificado autofirmado activará una advertencia del navegador en la primera visita. Acéptala para continuar.

### Build de producción

```bash
npm run build    # Compila el frontend en dist/
npm start        # Inicia el servidor de producción
```

## Despliegue con Docker

Se incluyen un `Dockerfile` y un `docker-compose.yml` para un despliegue autoalojado sencillo.

```bash
# Primero compilar el frontend
npm run build

# Construir e iniciar con Docker Compose
docker compose up -d
```

El `docker-compose.yml` expone:
- Puerto **3099** -> HTTPS (3000 dentro del contenedor)
- Puerto **3098** -> HTTP (3001 dentro del contenedor)

Los datos se persisten en el volumen Docker `foodai-data`.

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

## Variables de entorno

| Variable | Requerida | Por defecto | Descripción |
|----------|----------|------------|-------------|
| `GEMINI_API_KEY` | No | -- | Clave API de Gemini por defecto (también se puede configurar en la app) |
| `DB_DIR` | No | `./` | Directorio para la base de datos SQLite y los certificados SSL |
| `HTTP_PORT` | No | `3001` | Puerto para el servidor HTTP |
| `NODE_ENV` | No | -- | Establecer en `production` para servir el frontend precompilado |

## Estructura del proyecto

```
server.ts          Backend Express (rutas API, integración IA, base de datos)
src/
  App.tsx          Configuración del enrutador React
  main.tsx         Punto de entrada
  types.ts         Interfaces TypeScript
  pages/
    Dashboard.tsx  Vista general (artículos por caducar, paquetes abiertos, comidas de hoy)
    Inventory.tsx  Gestión de inventario por paquete
    Scanner.tsx    Escáner de códigos de barras + cámara IA
    Recipes.tsx    Generación de recetas con IA (individual + semanal)
    Calendar.tsx   Calendario de planificación de comidas
    FreeCook.tsx   Asistente de cocina libre
    ShoppingList.tsx  Lista de compras autogenerada
    Settings.tsx   Ajustes de proveedor IA, modelo e integraciones
  components/
    Navigation.tsx      Barra de navegación inferior
    RecipeCard.tsx       Componente de visualización de recetas
    OpenedItemsModal.tsx Modal para ajustes de caducidad de artículos abiertos
```

## Apoyo

Si encuentras este proyecto útil, considera invitarme a un café:

[![PayPal](https://img.shields.io/badge/PayPal-Donar-blue?logo=paypal)](https://www.paypal.com/paypalme/germanquestions)

## Licencia

Apache-2.0
