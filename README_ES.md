🌍 [English](README.md) | [Deutsch](README_DE.md) | [Fran&ccedil;ais](README_FR.md) | [Espa&ntilde;ol](README_ES.md) | [Italiano](README_IT.md)

<div align="center">
<img src="foodai_banner.png" alt="FoodAI Banner" width="100%" />
</div>

# FoodAI

Un gestor de inventario de cocina autoalojado con escaneo de códigos de barras con IA, generación de recetas y planificación de comidas. Construido con React, Express y SQLite.

[![PayPal](https://img.shields.io/badge/PayPal-Donar-blue?logo=paypal)](https://www.paypal.com/paypalme/germanquestions)

---

## Aviso de seguridad
FoodAI **no tiene autenticacion integrada**. Esta disenado solo para redes locales de confianza. NO lo expongas a internet publico sin anadir un reverse proxy con autenticacion (por ej. Authelia, Authentik o HTTP Basic Auth via Caddy/nginx).

---

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
- **Tema Oscuro/Claro/Personalizado** -- Cambia entre los temas Claro, Oscuro y Personalizado en Ajustes. El tema personalizado permite subir un archivo CSS.
- **Seguimiento de precios por articulo** -- Cada articulo del inventario puede tener un precio (EUR). El panel muestra el valor total del stock.
- **Ubicacion de almacenamiento** -- Asigna articulos a armario de despensa, frigorifico, congelador, despensa o bodega.
- **Alertas de stock minimo** -- Establece un umbral de stock minimo por articulo. El panel muestra la cantidad de articulos con stock bajo.
- **Inspiracion culinaria RSS** -- La barra lateral del panel muestra ideas de recetas diarias de GuteKueche.de (DE) o BBC Good Food (EN), con TheMealDB como respaldo.
- **Lista de modelos IA en vivo** -- El desplegable en Ajustes obtiene los modelos disponibles de la API del proveedor (Gemini, OpenAI, Anthropic, DeepSeek, Moonshot, Ollama).
- **Mejoras de seguridad** -- Limitacion de velocidad en endpoints de IA, proteccion XSS, validacion SSRF, secretos enmascarados, contenedor Docker sin root.

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

| Proveedor | Notas |
|-----------|-------|
| Google Gemini | Cualquier modelo (ej. Gemini 2.5 Flash/Pro). Introduce el ID del modelo en Ajustes. |
| OpenAI | Cualquier modelo (ej. GPT-4o, o1). Introduce el ID del modelo en Ajustes. |
| Anthropic | Cualquier modelo (ej. Claude Opus 4.6, Sonnet). Introduce el ID del modelo en Ajustes. |
| DeepSeek | Cualquier modelo (ej. deepseek-chat). Introduce el ID del modelo en Ajustes. |
| Moonshot (Kimi) | Cualquier modelo. Introduce el ID del modelo en Ajustes. |
| Ollama (local) | Cualquier modelo descargado localmente (llama3, mistral, llava, etc.) |

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

Imagenes multi-arch preconstruidas (amd64 + arm64) se publican en el GitHub Container Registry con cada release.

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

FoodAI requiere HTTPS para el acceso a la camara en moviles. Un certificado autofirmado se genera automaticamente en el primer inicio. Acepta la advertencia del navegador una vez, o monta tus propios certificados:

```yaml
volumes:
  - ./certs/cert.pem:/app/data/server.cert:ro
  - ./certs/key.pem:/app/data/server.key:ro
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

## Contribuir traducciones

FoodAI usa [react-i18next](https://react.i18next.com/). Los archivos de traduccion estan en `src/i18n/locales/`.

Para anadir un nuevo idioma:

1. Copia `src/i18n/locales/en.json` a `src/i18n/locales/xx.json`
2. Traduce todos los valores (mantén las claves en ingles)
3. Anade el import en `src/i18n/i18n.ts`
4. Anade la opcion de idioma en `src/pages/Settings.tsx`
5. Envia un PR!

---

## Licencia

Apache-2.0 — ver [LICENSE](LICENSE)

---

<div align="center">

**Built with ❤️ and AI by [N3LSON](https://nnelson.de/)**

[![PayPal](https://img.shields.io/badge/Buy_me_a_coffee-PayPal-blue?logo=paypal)](https://www.paypal.com/paypalme/germanquestions)

</div>
