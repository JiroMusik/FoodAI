import 'dotenv/config';
import express from 'express';
import http from 'http';
import https from 'https';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import { GoogleGenAI, Type } from '@google/genai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import path from 'path';
import fs from 'fs';
import Parser from 'rss-parser';

const app = express();
const PORT = 3000;

// No CORS middleware: FoodAI is designed for self-hosted, trusted local networks only.
// If you need cross-origin access, add a reverse proxy with appropriate CORS headers.

app.use(express.json({ limit: '10mb' }));

// Larger body limit for image upload endpoints (base64 photos)
const largeBody = express.json({ limit: '50mb' });

// --- HTML escaping for XSS prevention ---
const escapeHtml = (s: string) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// --- LIKE metacharacter escaping for SQL injection prevention ---
const escapeLike = (s: string) => s.replace(/%/g, '\\%').replace(/_/g, '\\_');

// --- SSRF prevention: validate URLs before fetching ---
function isAllowedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) return false;
    // Block cloud metadata endpoints
    if (u.hostname === '169.254.169.254') return false;
    return true;
  } catch { return false; }
}

// --- In-memory rate limiter for AI endpoints ---
const aiRateLimit = new Map<string, number[]>();
function checkRateLimit(ip: string, maxPerMinute: number = 10): boolean {
  const now = Date.now();
  const timestamps = (aiRateLimit.get(ip) || []).filter(t => now - t < 60000);
  if (timestamps.length >= maxPerMinute) return false;
  timestamps.push(now);
  aiRateLimit.set(ip, timestamps);
  return true;
}

// --- Settings key allowlist ---
const ALLOWED_SETTINGS = ['ai_provider', 'ai_model', 'ai_api_key', 'ollama_url', 'bring_email', 'bring_password', 'advisor_model', 'language'];

const mapCategory = (rawCategory: string, productName: string): string => {
  const text = `${rawCategory} ${productName}`.toLowerCase();

  // Gewürze & Saucen ZUERST — viele Gewürze werden sonst als Gemüse/Fleisch/Getränke gematcht
  if (text.match(/gewürz|spice|sauce|condiment|salz\b|pfeffer|ketchup|mayo|remoulade|senf|essig|öl\b|olivenöl|dressing|marinade|brühe|bouillon|fond|soja|worcester|tabasco|sriracha|pesto|curry|kurkuma|kümmel|basilikum|rosmarin|oregano|thymian|petersilie|schnittlauch|dill|muskatnuss|paprika.*scharf|chili|peperoncin|ras el hanout|garam masala|zimt|nelke|anis|koriander|knoblauch.*granul|zwiebel.*pulver|sesam.*paste|tahina|saucenbinder|röstzwiebel|hackfleisch.*würz|steak.*pfeffer|pizza.*gewürz|pasta.*würz|bolognese.*gewürz|ankerkraut|fuchs|ostmann|ubena|cornichon|olive|kapern|gewürzzubereitung/)) return 'Gewürze & Saucen';
  // Tiefkühl (hat Vorrang vor Fleisch/Fisch)
  if (text.match(/frozen|tiefkühl|tiefgefroren|tk[ -]|ice cream|eis am stiel|pizza.*frozen|iglo|frosta|bofrost|gefrier|golden longs|rösti.*stäbchen/)) return 'Tiefkühl';
  // Kühlregal
  if (text.match(/dairy|milk|cheese|yogurt|milch|käse|joghurt|butter|cream|sahne|quark|schmand|skyr|frischkäse|aufschnitt|aufstrich|margarine|\bei\b|eier|creme fraiche|mascarpone|ricotta|mozzarella|grana padano|parmesan|kochsahne|vollmilch|creme fine|creme legere|schmetten|sauerrahm|topfen|hüttenkäse|philadelphia|bresso/)) return 'Kühlregal';
  // Fleisch & Fisch (nach Gewürze — damit "Rinder Bouillon" nicht hier landet)
  if (text.match(/meat|poultry|beef|pork|chicken|fleisch|hähnchen|wurst|würstchen|dörffler|schinken|salami|lachs|thunfisch|garnele|hack\b|rind.*steak|rind.*filet|rind.*roast|schwein|pute|truthahn|shrimp|pangasius|forelle|fish.*filet|fisch.*stäbchen/)) return 'Fleisch & Fisch';
  // Backwaren
  if (text.match(/bread|bakery|pastry|brot|brötchen|toast|kuchen|croissant|baguette|semmel|lauge|donut|muffin|teig|blätterteig|pizzateig|brioche|bun\b|hotdog.*roll|hotdog.*brød|sandwich|wrap|tortilla/)) return 'Backwaren';
  // Obst & Gemüse
  if (text.match(/fruit|vegetable|obst|gemüse|apple|banana|tomato|potato|apfel|banane|tomate|kartoffel|gurke|paprika|zwiebel\b|knoblauch\b|ingwer|salat|beere|pilz|champignon|karotte|möhre|brokkoli|zucchini|schalott|scharlott/)) return 'Obst & Gemüse';
  // Getränke
  if (text.match(/beverage|drink|water|juice|getränk|wasser|saft|cola|beer|wine|bier|wein|limonade|sprudel|kaffee|tee|milch.*drink/)) return 'Getränke';
  // Snacks & Süßigkeiten
  if (text.match(/snack|sweet|candy|chocolate|chips|süßigkeit|schokolade|keks|gummibärchen|riegel|nuss|nüsse/)) return 'Snacks & Süßigkeiten';
  // Haushalt & Drogerie
  if (text.match(/cleaning|hygiene|paper|household|haushalt|drogerie|seife|shampoo|waschmittel|spülmittel|papier|beutel|folie|schwamm/)) return 'Haushalt & Drogerie';
  // Vorratsschrank (Fallback für alles was lange hält)
  if (text.match(/pasta|rice|cereal|flour|sugar|noodle|reis|mehl|zucker|konserve|dose|canned|passierte tomaten|gehackte tomaten|tomatenmark|haferflocken|müsli|nudeln|spaghetti|spaghettoni|makkaroni|hörnchen|lasagne|penne|fusilli|linse|bohne|kidney|erbse|rotkohl|honig|blütenhonig|artischock|puder.*zucker|risi.*bisi/)) return 'Vorratsschrank';
  
  return 'Sonstiges';
};

// Initialize SQLite Database
const dbDir = process.env.DB_DIR || process.cwd();
const dbPath = path.join(dbDir, 'inventory.db');
const db = new Database(dbPath);

const initDB = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      generic_name TEXT,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      expiry_date TEXT,
      category TEXT,
      barcode TEXT,
      pieces_per_pack INTEGER DEFAULT 1,
      package_size REAL,
      is_open BOOLEAN DEFAULT 0,
      opened_at DATETIME,
      location TEXT DEFAULT 'Vorratsschrank',
      price REAL,
      min_stock REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS product_lookup (
      barcode TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      generic_name TEXT,
      category TEXT NOT NULL,
      default_quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      pieces_per_pack INTEGER DEFAULT 1,
      location TEXT,
      price REAL,
      min_stock REAL
    );

    CREATE TABLE IF NOT EXISTS planned_recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      ingredients TEXT NOT NULL,
      instructions TEXT NOT NULL,
      portions INTEGER DEFAULT 2,
      base_portions INTEGER DEFAULT 2,
      cooked INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS weekly_plan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_of_week TEXT NOT NULL,
      recipe_title TEXT NOT NULL,
      recipe_content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS favorite_recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      ingredients TEXT NOT NULL,
      instructions TEXT NOT NULL,
      portions INTEGER DEFAULT 2,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Column Migrations
  // Note: String concatenation here is safe — all values are hardcoded literals, not user input.
  const addColumn = (table: string, column: string, type: string) => {
    try {
      db.exec('ALTER TABLE ' + table + ' ADD COLUMN ' + column + ' ' + type);
    } catch (e) {}
  };

  addColumn('items', 'generic_name', 'TEXT');
  addColumn('product_lookup', 'generic_name', 'TEXT');
  addColumn('items', 'opened_at', 'DATETIME');
  addColumn('items', 'is_open', 'BOOLEAN DEFAULT 0');
  addColumn('items', 'package_size', 'REAL');
  addColumn('items', 'location', 'TEXT DEFAULT "Vorratsschrank"');
  addColumn('items', 'price', 'REAL');
  addColumn('items', 'min_stock', 'REAL DEFAULT 0');
  addColumn('product_lookup', 'location', 'TEXT');
  addColumn('product_lookup', 'price', 'REAL');
  addColumn('product_lookup', 'min_stock', 'REAL');

  // Value Migrations
  db.transaction(() => {
    // Migrate "Packung" units to "Stück"
    db.prepare("UPDATE items SET unit = 'Stück' WHERE unit = 'Packung'").run();
    db.prepare("UPDATE product_lookup SET unit = 'Stück' WHERE unit = 'Packung'").run();

    // Ensure package_size is set
    db.prepare("UPDATE items SET package_size = quantity WHERE package_size IS NULL OR package_size = 0").run();

    // Fix "null" strings in expiry_date
    db.prepare("UPDATE items SET expiry_date = NULL WHERE expiry_date = 'null' OR expiry_date = 'undefined' OR expiry_date = ''").run();


    // Category migration
    const updates = [
      { old: 'BREAD', new: 'Backwaren' },
      { old: 'SALT', new: 'Gewürze & Saucen' },
      { old: 'FRUIT', new: 'Obst & Gemüse' },
      { old: 'VEGETABLE', new: 'Obst & Gemüse' },
      { old: 'MEAT', new: 'Fleisch & Fisch' },
      { old: 'DAIRY', new: 'Kühlregal' },
      { old: 'BEVERAGE', new: 'Getränke' },
      { old: 'SNACK', new: 'Snacks & Süßigkeiten' },
      { old: 'PANTRY', new: 'Vorratsschrank' },
      { old: 'OTHER', new: 'Sonstiges' }
    ];
    
    const stmtItems = db.prepare('UPDATE items SET category = ? WHERE UPPER(category) = ?');
    const stmtLookup = db.prepare('UPDATE product_lookup SET category = ? WHERE UPPER(category) = ?');
    
    for (const u of updates) {
      stmtItems.run(u.new, u.old);
      stmtLookup.run(u.new, u.old);
    }

    // Re-categorize all items for better consistency
    const items = db.prepare('SELECT id, name, category FROM items').all() as any[];
    const updateItemCat = db.prepare('UPDATE items SET category = ? WHERE id = ?');
    for (const item of items) {
      const newCat = mapCategory(item.category || '', item.name);
      if (newCat !== item.category) {
        updateItemCat.run(newCat, item.id);
      }
    }
  })();
};

initDB();

// Re-categorize runs after mapCategory is defined (see below)

// Gemini AI Setup (lazy — key may come from DB settings later)
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

// --- AI Helper ---
async function getAIResponse(prompt: string, imageBase64?: string, schema?: any, useAdvisorModel: boolean = false) {
  const aiProvider = (db.prepare('SELECT value FROM settings WHERE key = ?').get('ai_provider') as any)?.value || 'gemini';
  let aiModel = (db.prepare('SELECT value FROM settings WHERE key = ?').get(useAdvisorModel ? 'advisor_model' : 'ai_model') as any)?.value;
  const apiKey = (db.prepare('SELECT value FROM settings WHERE key = ?').get('ai_api_key') as any)?.value;
  const ollamaUrl = (db.prepare('SELECT value FROM settings WHERE key = ?').get('ollama_url') as any)?.value || 'http://localhost:11434';

  console.log(`AI Request: Provider=${aiProvider}, Model=${aiModel || 'default'}`);

  // Default models if not set
  if (!aiModel) {
    if (aiProvider === 'gemini') aiModel = 'gemini-3-flash-preview';
    if (aiProvider === 'openai') aiModel = 'gpt-4o';
    if (aiProvider === 'anthropic') aiModel = 'claude-3-5-sonnet-latest';
  }

  try {
    if (aiProvider === 'gemini') {
      const geminiKey = apiKey || process.env.GEMINI_API_KEY;
      if (!geminiKey) throw new Error('Gemini API Key missing');
      
      const genAI = new GoogleGenAI({ apiKey: geminiKey });
      const response = await genAI.models.generateContent({
        model: aiModel,
        contents: imageBase64 ? {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: imageBase64.replace(/^data:image\/\w+;base64,/, '') } },
            { text: prompt }
          ]
        } : { parts: [{ text: prompt }] },
        config: schema ? {
          responseMimeType: 'application/json',
          responseSchema: schema
        } : undefined
      });
      
      const text = response.text;
      if (!text) throw new Error('Empty response from Gemini');
      
      console.log('Gemini Raw Response:', text);
      const cleanJson = text.replace(/```json\n?|```/g, '').trim();
      try {
        return JSON.parse(cleanJson);
      } catch (e) {
        console.error('JSON Parse Error (Gemini):', e);
        // Try to extract JSON if there's extra text
        const match = cleanJson.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw e;
      }
    }

    if (aiProvider === 'openai' || aiProvider === 'deepseek' || aiProvider === 'moonshot') {
      let baseURL = undefined;
      if (aiProvider === 'deepseek') baseURL = 'https://api.deepseek.com';
      if (aiProvider === 'moonshot') baseURL = 'https://api.moonshot.cn/v1';

      const client = new OpenAI({ apiKey, baseURL });
      const messages: any[] = [{ role: 'user', content: [{ type: 'text', text: prompt }] }];
      
      if (imageBase64) {
        messages[0].content.push({
          type: 'image_url',
          image_url: { url: imageBase64 }
        });
      }

      const response = await client.chat.completions.create({
        model: aiModel,
        messages,
        response_format: schema ? { type: 'json_object' } : undefined
      });
      const content = response.choices[0].message.content;
      if (!content) throw new Error('Empty response from AI');
      const cleanJson = content.replace(/```json\n?|```/g, '').trim();
      return JSON.parse(cleanJson);
    }

    if (aiProvider === 'anthropic') {
      const anthropic = new Anthropic({ apiKey });
      const content: any[] = [{ type: 'text', text: prompt }];
      
      if (imageBase64) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: imageBase64.replace(/^data:image\/\w+;base64,/, '')
          }
        });
      }

      const response = await anthropic.messages.create({
        model: aiModel,
        max_tokens: 1024,
        messages: [{ role: 'user', content }]
      });
      const text = (response.content[0] as any).text;
      const cleanJson = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
      return JSON.parse(cleanJson);
    }

    if (aiProvider === 'ollama') {
      if (!isAllowedUrl(ollamaUrl)) throw new Error('Invalid Ollama URL');
      const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        body: JSON.stringify({
          model: aiModel,
          prompt: prompt,
          images: imageBase64 ? [imageBase64.replace(/^data:image\/\w+;base64,/, '')] : [],
          format: 'json',
          stream: false
        })
      });
      const data = await response.json();
      return JSON.parse(data.response);
    }
  } catch (err: any) {
    console.error('AI Error:', err.message);
    throw err;
  }

  throw new Error('Unsupported AI Provider');
}

// --- Unit and Matching Utilities ---
const normalizeUnit = (unit: string): string => {
  const u = unit.toLowerCase().trim();
  if (u === 'g' || u === 'gramm') return 'g';
  if (u === 'kg' || u === 'kilogramm') return 'kg';
  if (u === 'ml' || u === 'milliliter') return 'ml';
  if (u === 'l' || u === 'liter') return 'l';
  if (u === 'stk' || u === 'stück' || u === 'piece' || u === 'pcs') return 'Stück';
  if (u === 'pkg' || u === 'packung' || u === 'pack') return 'Packung';
  return unit;
};

const convertToSmallestUnit = (amount: number, unit: string): { amount: number, unit: string } => {
  const norm = normalizeUnit(unit);
  if (norm === 'kg') return { amount: amount * 1000, unit: 'g' };
  if (norm === 'l') return { amount: amount * 1000, unit: 'ml' };
  return { amount, unit: norm };
};

const amountsMatch = (reqAmt: number, reqUnit: string, invAmt: number, invUnit: string): boolean => {
  const req = convertToSmallestUnit(reqAmt, reqUnit);
  const inv = convertToSmallestUnit(invAmt, invUnit);
  if (req.unit !== inv.unit) return false;
  return inv.amount >= req.amount;
};

// --- API Routes ---

app.get('/api/settings/models', async (req, res) => {
  try {
    const provider = (db.prepare('SELECT value FROM settings WHERE key = ?').get('ai_provider') as any)?.value || 'gemini';
    const apiKey = (db.prepare('SELECT value FROM settings WHERE key = ?').get('ai_api_key') as any)?.value || process.env.GEMINI_API_KEY || '';
    const ollamaUrl = (db.prepare('SELECT value FROM settings WHERE key = ?').get('ollama_url') as any)?.value || 'http://localhost:11434';

    const models: Record<string, string[]> = {
      gemini: [], openai: [], anthropic: [], moonshot: [], deepseek: [], ollama: []
    };

    // Fetch live model lists from providers with API key
    if (apiKey) {
      try {
        if (provider === 'gemini') {
          const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
            headers: { 'x-goog-api-key': apiKey }
          });
          if (r.ok) {
            const data = await r.json();
            models.gemini = (data.models || [])
              .map((m: any) => m.name?.replace('models/', '') || '')
              .filter((id: string) => id && !id.includes('embedding') && !id.includes('aqa'))
              .sort();
          }
        } else if (provider === 'openai') {
          const r = await fetch('https://api.openai.com/v1/models', { headers: { 'Authorization': `Bearer ${apiKey}` } });
          if (r.ok) {
            const data = await r.json();
            models.openai = (data.data || [])
              .map((m: any) => m.id)
              .filter((id: string) => id.includes('gpt') || id.includes('o1') || id.includes('o3') || id.includes('chatgpt'))
              .sort();
          }
        } else if (provider === 'anthropic') {
          const r = await fetch('https://api.anthropic.com/v1/models', {
            headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
          });
          if (r.ok) {
            const data = await r.json();
            models.anthropic = (data.data || []).map((m: any) => m.id).sort();
          }
        } else if (provider === 'deepseek') {
          const r = await fetch('https://api.deepseek.com/v1/models', { headers: { 'Authorization': `Bearer ${apiKey}` } });
          if (r.ok) {
            const data = await r.json();
            models.deepseek = (data.data || []).map((m: any) => m.id).sort();
          }
        } else if (provider === 'moonshot') {
          const r = await fetch('https://api.moonshot.cn/v1/models', { headers: { 'Authorization': `Bearer ${apiKey}` } });
          if (r.ok) {
            const data = await r.json();
            models.moonshot = (data.data || []).map((m: any) => m.id).sort();
          }
        }
      } catch (e) {
        console.error(`Failed to fetch ${provider} models:`, e);
      }
    }

    // Ollama: always try (no API key needed)
    try {
      if (!isAllowedUrl(ollamaUrl)) throw new Error('Invalid Ollama URL');
      const r = await fetch(`${ollamaUrl}/api/tags`);
      if (r.ok) {
        const data = await r.json();
        models.ollama = (data.models || []).map((m: any) => m.name).sort();
      }
    } catch (e) { /* Ollama not running */ }

    res.json(models);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

app.get('/api/inventory', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM items ORDER BY category ASC, expiry_date ASC').all();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

app.get('/api/dashboard', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const threeDaysLaterStr = threeDaysLater.toISOString().split('T')[0];

    const expiringSoon = db.prepare('SELECT * FROM items WHERE expiry_date <= ? AND quantity > 0 ORDER BY expiry_date ASC').all(threeDaysLaterStr);
    const openedItems = db.prepare('SELECT * FROM items WHERE is_open = 1 AND quantity > 0 ORDER BY opened_at DESC').all();
    const todaysRecipes = db.prepare('SELECT * FROM planned_recipes WHERE date = ?').all(today).map((r: any) => ({
      ...r,
      ingredients: JSON.parse(r.ingredients),
      instructions: JSON.parse(r.instructions),
      cooked: r.cooked === 1
    }));

    const totalValue = db.prepare('SELECT SUM(price * quantity) as value FROM items WHERE price IS NOT NULL').get() as any;
    const lowStockCount = (db.prepare('SELECT COUNT(*) as cnt FROM items WHERE min_stock > 0 AND quantity <= min_stock').get() as any)?.cnt || 0;

    res.json({ expiringSoon, openedItems, todaysRecipes, totalValue: totalValue?.value || 0, lowStockCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

app.get('/api/shopping-list', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const upcomingRecipes = db.prepare('SELECT * FROM planned_recipes WHERE date >= ? AND cooked = 0').all(today);
    
    const required: Record<string, { amount: number, unit: string, name: string }> = {};

    upcomingRecipes.forEach((recipe: any) => {
      const ingredients = JSON.parse(recipe.ingredients);
      const ratio = recipe.portions / recipe.base_portions;
      ingredients.forEach((ing: any) => {
        const smallest = convertToSmallestUnit(ing.amount * ratio, ing.unit);
        const key = `${ing.name.toLowerCase()}_${smallest.unit}`;
        if (!required[key]) {
          required[key] = { amount: 0, unit: smallest.unit, name: ing.name };
        }
        required[key].amount += smallest.amount;
      });
    });

    const inventory = db.prepare('SELECT name, quantity, unit, min_stock FROM items WHERE quantity > 0').all() as any[];
    
    // Add items that are below minimum stock
    const allKnownItems = db.prepare('SELECT name, quantity, unit, min_stock FROM items').all() as any[];
    const lowStockItems: Record<string, { amount: number, unit: string, name: string }> = {};
    
    // Group by name and unit for min_stock check
    const stockLevels: Record<string, { total: number, min: number, unit: string }> = {};
    allKnownItems.forEach(item => {
      const key = `${item.name.toLowerCase()}_${normalizeUnit(item.unit)}`;
      if (!stockLevels[key]) {
        stockLevels[key] = { total: 0, min: item.min_stock || 0, unit: normalizeUnit(item.unit) };
      }
      const smallest = convertToSmallestUnit(item.quantity, item.unit);
      stockLevels[key].total += smallest.amount;
    });

    Object.entries(stockLevels).forEach(([key, level]) => {
      if (level.min > 0 && level.total < level.min) {
        const name = key.split('_')[0];
        const missing = level.min - level.total;
        if (!required[key]) {
          required[key] = { amount: 0, unit: level.unit, name: name.charAt(0).toUpperCase() + name.slice(1) };
        }
        required[key].amount += missing;
      }
    });

    const missingIngredients: any[] = [];

    Object.values(required).forEach((reqIng: any) => {
      const matchingItems = inventory.filter(inv => {
        const isNameMatch = inv.name.toLowerCase().includes(reqIng.name.toLowerCase()) || 
                          reqIng.name.toLowerCase().includes(inv.name.toLowerCase());
        if (!isNameMatch) return false;
        const invSmallest = convertToSmallestUnit(inv.quantity, inv.unit);
        return invSmallest.unit === reqIng.unit;
      });

      const totalInInventory = matchingItems.reduce((sum, inv) => {
        const invSmallest = convertToSmallestUnit(inv.quantity, inv.unit);
        return sum + invSmallest.amount;
      }, 0);

      if (totalInInventory < reqIng.amount) {
        let diff = reqIng.amount - totalInInventory;
        let displayAmount = diff;
        let displayUnit = reqIng.unit;

        // Convert back to larger units for display if appropriate
        if (displayUnit === 'g' && displayAmount >= 1000) {
          displayAmount /= 1000;
          displayUnit = 'kg';
        } else if (displayUnit === 'ml' && displayAmount >= 1000) {
          displayAmount /= 1000;
          displayUnit = 'l';
        }

        missingIngredients.push({
          name: reqIng.name,
          amountNeeded: Math.round(displayAmount * 100) / 100,
          unit: displayUnit
        });
      }
    });

    res.json({ missingIngredients });
  } catch (error) {
    console.error('Shopping list error:', error);
    res.status(500).json({ error: 'Failed to generate shopping list' });
  }
});

app.get('/api/barcode/lookup/:barcode', async (req, res) => {
  const { barcode } = req.params;
  try {
    // 1. Check local database first
    const product = db.prepare('SELECT * FROM product_lookup WHERE barcode = ?').get(barcode) as any;
    if (product) {
      return res.json(product);
    }

    // 2. Fallback to OpenFoodFacts (Free, good for EAN/European products)
    console.log(`Barcode ${barcode} not in local DB, checking OpenFoodFacts...`);
    try {
      const offRes = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      if (offRes.ok) {
        const offData = await offRes.json() as any;
        if (offData.status === 1 && offData.product) {
          const p = offData.product;
          
          const rawCategory = p.categories_tags?.join(' ') || '';
          const mappedCategory = mapCategory(rawCategory, p.product_name || '');

          let parsedQuantity = 1;
          let parsedUnit = p.serving_quantity_unit || 'Stück';
          
          if (p.quantity) {
            const qMatch = p.quantity.match(/([\d.,]+)\s*([a-zA-Z%]+)/);
            if (qMatch) {
              parsedQuantity = parseFloat(qMatch[1].replace(',', '.'));
              parsedUnit = qMatch[2].toLowerCase();
              if (!['g', 'kg', 'ml', 'l', '%'].includes(parsedUnit)) {
                parsedUnit = 'Stück';
              }
            }
          }

          let genericName = p.generic_name || p.product_name || 'Unbekanntes Produkt';
          // Extended brand list based on user feedback
          genericName = genericName.replace(/^(Ja!|Gut & Günstig|K-Classic|Milbona|Alnatura|Barilla|Mutti|Oro di Parma|Rewe Beste Wahl|Edeka|Dr\. Oetker|Maggi|Knorr|Nestle|Kellogg's|Haribo|Lindt|Milka|Coca-Cola|Pepsi|Heinz|Kraft|Uncle Ben's|Mirácoli|Buitoni|Wagner|Iglo|Frosta|McCain|Coppenrath & Wiese|Langnese|Mövenpick|Landliebe|Weihenstephan|Müller|Danone|Zott|Ehrmann|Bauer|Andechser|Söbbeke|Rügenwalder Mühle|Herta|Meica|Wiesenhof|Gutfried|Rasting|Wilhelm Brandenburg|Kölln|Brüggen|Seitenbacher|Dr\. Karg|Wasa|Leibniz|Bahlsen|Griesson|De Beukelaer|Prinzen Rolle|Ritter Sport|Milka|Lindt|Ferrero|Kinder|Nutella|Hanuta|Duplo|Knoppers|Toffifee|Yogurette|Mon Chéri|Raffaello|Giotto|Rocher|Küchenmeister|Aurora|Diamant|Südzucker|Nordzucker|Bad Reichenhaller|Fuchs|Ostmann|Ubena|Kühne|Hengstenberg|Thomy|Homann|Nadler|Popp|Dahlhoff|Bautz'ner|Born|Werder|Hela|Kraft|Heinz|Bull's Eye|Knorr|Maggi|Erasco|Sonnen Bassermann|Buss|Stührk|Appel|Hawesta|Saupiquet|Thunfisch|Dose|Konserve)\s+/i, '').trim();

          const newProduct = {
            barcode,
            name: p.product_name || genericName,
            generic_name: genericName,
            category: mappedCategory,
            default_quantity: parsedQuantity,
            unit: parsedUnit,
            pieces_per_pack: 1
          };

          // If unit is 'g' but quantity is 1 and no weight info, default to Stück
          if (newProduct.unit === 'g' && newProduct.default_quantity === 1 && !p.quantity?.match(/1\s*g/i)) {
             newProduct.unit = 'Stück';
          }
          // Convert "Packung" to actual content unit
          if (newProduct.unit === 'Packung' || newProduct.unit === 'packung') {
             newProduct.unit = 'Stück';
          }

          // Try to extract pieces per pack from product name or quantity if possible
          // e.g. "15 Stück"
          const piecesMatch = p.quantity?.match(/(\d+)\s*(Stück|pcs|pieces)/i);
          if (piecesMatch) {
            newProduct.pieces_per_pack = parseInt(piecesMatch[1]);
          }

          db.prepare('INSERT OR IGNORE INTO product_lookup (barcode, name, generic_name, category, default_quantity, unit, pieces_per_pack) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run(newProduct.barcode, newProduct.name, newProduct.generic_name, newProduct.category, newProduct.default_quantity, newProduct.unit, newProduct.pieces_per_pack);
          
          return res.json(newProduct);
        }
      }
    } catch (e) {
      console.error('OpenFoodFacts error:', e);
    }

    // 3. Fallback to upcitemdb trial
    console.log(`Barcode ${barcode} not in OpenFoodFacts, checking upcitemdb...`);
    try {
      const upcRes = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
      if (upcRes.ok) {
        const upcData = await upcRes.json();
        if (upcData.items && upcData.items.length > 0) {
          const item = upcData.items[0];
          
          let genericName = item.title || 'Unbekanntes Produkt';
          // Clean up brand names (same list as above)
          genericName = genericName.replace(/^(Ja!|Gut & Günstig|K-Classic|Milbona|Alnatura|Barilla|Mutti|Oro di Parma|Rewe Beste Wahl|Edeka|Dr\. Oetker|Maggi|Knorr|Nestle|Kellogg's|Haribo|Lindt|Milka|Coca-Cola|Pepsi|Heinz|Kraft|Uncle Ben's|Mirácoli|Buitoni|Wagner|Iglo|Frosta|McCain|Coppenrath & Wiese|Langnese|Mövenpick|Landliebe|Weihenstephan|Müller|Danone|Zott|Ehrmann|Bauer|Andechser|Söbbeke|Rügenwalder Mühle|Herta|Meica|Wiesenhof|Gutfried|Rasting|Wilhelm Brandenburg|Kölln|Brüggen|Seitenbacher|Dr\. Karg|Wasa|Leibniz|Bahlsen|Griesson|De Beukelaer|Prinzen Rolle|Ritter Sport|Milka|Lindt|Ferrero|Kinder|Nutella|Hanuta|Duplo|Knoppers|Toffifee|Yogurette|Mon Chéri|Raffaello|Giotto|Rocher|Küchenmeister|Aurora|Diamant|Südzucker|Nordzucker|Bad Reichenhaller|Fuchs|Ostmann|Ubena|Kühne|Hengstenberg|Thomy|Homann|Nadler|Popp|Dahlhoff|Bautz'ner|Born|Werder|Hela|Kraft|Heinz|Bull's Eye|Knorr|Maggi|Erasco|Sonnen Bassermann|Buss|Stührk|Appel|Hawesta|Saupiquet|Thunfisch|Dose|Konserve)\s+/i, '').trim();

          const mappedCategory = mapCategory(item.category || '', item.title || '');
          
          // Try to parse quantity from title/description if not explicit
          let parsedQuantity = 1;
          let parsedUnit = 'Stück';
          
          const qMatch = item.title.match(/(\d+)\s*(g|kg|ml|l|oz|lb)/i);
          if (qMatch) {
             parsedQuantity = parseFloat(qMatch[1]);
             parsedUnit = qMatch[2].toLowerCase();
             if (parsedUnit === 'oz') { parsedQuantity = Math.round(parsedQuantity * 28.35); parsedUnit = 'g'; }
             if (parsedUnit === 'lb') { parsedQuantity = Math.round(parsedQuantity * 453.59); parsedUnit = 'g'; }
          }

          const newProduct = {
            barcode,
            name: genericName,
            generic_name: genericName,
            category: mappedCategory,
            default_quantity: parsedQuantity,
            unit: parsedUnit,
            pieces_per_pack: 1
          };
          
          db.prepare('INSERT OR IGNORE INTO product_lookup (barcode, name, generic_name, category, default_quantity, unit, pieces_per_pack) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run(newProduct.barcode, newProduct.name, newProduct.generic_name, newProduct.category, newProduct.default_quantity, newProduct.unit, newProduct.pieces_per_pack);

          return res.json(newProduct);
        }
      }
    } catch (e) {
      console.error('UPCItemDB error:', e);
    }

    res.status(404).json({ error: 'Product not found' });
  } catch (error) {
    console.error('Barcode lookup error:', error);
    res.status(500).json({ error: 'Database or API error' });
  }
});

app.post('/api/recipes/weekly', async (req, res) => {
  if (!checkRateLimit(req.ip || 'unknown')) return res.status(429).json({ error: 'Rate limit exceeded. Try again in a minute.' });
  const { preferences, portions } = req.body;
  try {
    const items = db.prepare('SELECT generic_name, name, quantity, unit, expiry_date, category FROM items').all();
    
    // Group items by generic_name and unit, but keep track of open status and expiry
    const groupedInventory: Record<string, { quantity: number, unit: string, details: string[], category: string }> = {};
    
    items.forEach((i: any) => {
      const key = `${i.generic_name || i.name}_${i.unit}`;
      if (!groupedInventory[key]) {
        groupedInventory[key] = { quantity: 0, unit: i.unit, details: [], category: i.category };
      }
      groupedInventory[key].quantity += i.quantity;
      
      let detail = `${i.quantity} ${i.unit}`;
      if (i.is_open) detail += ' (geöffnet)';
      if (i.expiry_date) detail += ` MHD: ${i.expiry_date}`;
      groupedInventory[key].details.push(detail);
    });

    const inventoryList = Object.entries(groupedInventory).map(([key, data]) => {
      const name = key.split('_')[0];
      // Summarize details if too many
      const detailsStr = data.details.length > 3 ? `${data.details.length} Packungen/Einheiten` : data.details.join(', ');
      return `- ${name}: ${data.quantity} ${data.unit} gesamt [${detailsStr}]`;
    }).join('\n');
    
    const prompt = `
      You are a professional meal planner. Create a 7-day meal plan (Monday to Sunday) for ${portions || 2} portions using the following ingredients from my inventory. 
      PRIORITIZE ingredients that are expiring soon (MHD) or are already opened (geöffnet).
      Include all available sauces and spices in your reasoning, and use them where appropriate.
      
      Inventory:
      ${inventoryList}
      
      User preferences: ${preferences || 'None'}
      
      Return a JSON object with a key "plan" which is an array of 7 objects. Each object must have:
      - day: "Montag", "Dienstag", etc.
      - title: Recipe title
      - description: Short description
      - ingredients: Array of objects { name, amount, unit, in_inventory (boolean) }
      - instructions: Array of strings (steps)
    `;

    const schema = {
      type: Type.OBJECT,
      properties: {
        plan: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              ingredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    amount: { type: Type.NUMBER },
                    unit: { type: Type.STRING },
                    in_inventory: { type: Type.BOOLEAN }
                  },
                  required: ["name", "amount", "unit", "in_inventory"]
                }
              },
              instructions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["day", "title", "description", "ingredients", "instructions"]
          }
        }
      },
      required: ["plan"]
    };

    const result = await getAIResponse(prompt, undefined, schema);
    
    // Save to DB
    db.prepare('DELETE FROM weekly_plan').run();
    const insert = db.prepare('INSERT INTO weekly_plan (day_of_week, recipe_title, recipe_content) VALUES (?, ?, ?)');
    for (const day of result.plan) {
      insert.run(day.day, day.title, JSON.stringify(day));
    }

    res.json(result);
  } catch (error) {
    console.error('Weekly plan error:', error);
    res.status(500).json({ error: 'Failed to generate weekly plan' });
  }
});

app.get('/api/recipes/weekly', (req, res) => {
  try {
    const plan = db.prepare('SELECT * FROM weekly_plan ORDER BY id ASC').all();
    const result = plan.map((row: any) => JSON.parse(row.recipe_content));
    res.json({ plan: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch weekly plan' });
  }
});

app.post('/api/inventory', (req, res) => {
  const { name, generic_name, quantity, unit, expiry_date, category, barcode, pieces_per_pack, location, price, min_stock } = req.body;
  try {
    // Save to product_lookup for future barcode scans
    if (barcode) {
      db.prepare('INSERT OR IGNORE INTO product_lookup (barcode, name, generic_name, category, default_quantity, unit, pieces_per_pack, location, price, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(barcode, name, generic_name || name, category, quantity, unit, pieces_per_pack || 1, location, price, min_stock);
    }

    // Sanitize expiry_date — AI sometimes returns "null" string
    const cleanExpiry = (expiry_date && expiry_date !== 'null' && expiry_date !== 'undefined') ? expiry_date : null;

    // Always create a new item — each physical package is its own row
    const stmt = db.prepare('INSERT INTO items (name, generic_name, quantity, unit, expiry_date, category, barcode, pieces_per_pack, package_size, is_open, location, price, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)');
    const info = stmt.run(name, generic_name || name, quantity, unit, cleanExpiry, category, barcode, pieces_per_pack || 1, quantity, location || 'Vorratsschrank', price || 0, min_stock || 0);
    res.json({ id: info.lastInsertRowid, name, generic_name: generic_name || name, quantity, unit, expiry_date, category, barcode, package_size: quantity, location: location || 'Vorratsschrank', price, min_stock });
  } catch (error) {
    console.error('Inventory add error:', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

app.put('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  const { name, generic_name, quantity, unit, expiry_date, category, package_size, location, price, min_stock } = req.body;
  try {
    // If quantity exceeds package_size, update package_size too
    const existing = db.prepare('SELECT package_size FROM items WHERE id = ?').get(id) as any;
    let newPackageSize = package_size || existing?.package_size || quantity;
    if (quantity > newPackageSize) {
      newPackageSize = quantity;
    }

    const stmt = db.prepare('UPDATE items SET name = ?, generic_name = ?, quantity = ?, unit = ?, expiry_date = ?, category = ?, package_size = ?, location = ?, price = ?, min_stock = ? WHERE id = ?');
    stmt.run(name, generic_name || name, quantity, unit, expiry_date, category, newPackageSize, location, price, min_stock, id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

app.delete('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  try {
    const stmt = db.prepare('DELETE FROM items WHERE id = ?');
    stmt.run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

app.post('/api/inventory/bulk-delete', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'No IDs provided' });
  try {
    const stmt = db.prepare('DELETE FROM items WHERE id = ?');
    db.transaction(() => {
      for (const id of ids) {
        stmt.run(id);
      }
    })();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk delete items' });
  }
});

app.post('/api/inventory/bulk-update', (req, res) => {
  const { ids, updates } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'No IDs provided' });
  try {
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
    const stmt = db.prepare(`UPDATE items SET ${fields} WHERE id = ?`);
    db.transaction(() => {
      for (const id of ids) {
        stmt.run(...values, id);
      }
    })();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk update items' });
  }
});

app.post('/api/inventory/:id/open', async (req, res) => {
  const { id } = req.params;
  try {
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as any;
    if (!item) return res.status(404).json({ error: 'Item not found' });

    db.prepare('UPDATE items SET is_open = 1, opened_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

    // AI Logic for expiry
    const prompt = `
      The user has opened the following food item:
      ID: ${item.id}, Name: ${item.name}
      
      Does this item spoil quickly after opening (within 2-5 days)?
      Examples for YES (spoil quickly): "Passierte Tomaten", "Streukäse", "Milch", "Sahne", "Würstchen im Glas", "Mais (Konserve)", "Bohnen".
      Examples for NO (last long): "Gewürzgurken", "Ketchup", "Senf", "Marmelade", "Reis", "Nudeln", "Mehl", "Essig", "Öl".
      
      Return a JSON object:
      - needs_new_expiry: boolean (true if it spoils quickly)
      - days_until_spoiled: number (e.g., 3 for passierte Tomaten, null if needs_new_expiry is false)
    `;

    const schema = {
      type: Type.OBJECT,
      properties: {
        needs_new_expiry: { type: Type.BOOLEAN },
        days_until_spoiled: { type: Type.NUMBER }
      },
      required: ["needs_new_expiry"]
    };

    const aiResult = await getAIResponse(prompt, undefined, schema, true);

    if (aiResult.needs_new_expiry && aiResult.days_until_spoiled) {
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + aiResult.days_until_spoiled);
      const expiryDate = newExpiry.toISOString().split('T')[0];
      db.prepare('UPDATE items SET expiry_date = ? WHERE id = ?').run(expiryDate, id);
    }

    const updatedItem = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    res.json(updatedItem);
  } catch (error) {
    console.error('Open item error:', error);
    res.status(500).json({ error: 'Failed to open item' });
  }
});

app.post('/api/ha/inventory/update', (req, res) => {
  const { id, barcode, name, action, value } = req.body;
  // action: 'set' (e.g. value=75 for 75%), 'deduct' (e.g. value=15 for 15g)
  try {
    let item;
    if (id) {
      item = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as any;
    } else if (barcode) {
      item = db.prepare('SELECT * FROM items WHERE barcode = ?').get(barcode) as any;
    } else if (name) {
      item = db.prepare("SELECT * FROM items WHERE name LIKE ? ESCAPE '\\'").get(`%${escapeLike(name)}%`) as any;
    }

    if (!item) return res.status(404).json({ error: 'Item not found' });

    let newQuantity = item.quantity;
    if (action === 'set') {
      newQuantity = value;
    } else if (action === 'deduct') {
      newQuantity = Math.max(0, item.quantity - value);
    }

    db.prepare('UPDATE items SET quantity = ? WHERE id = ?').run(newQuantity, item.id);
    res.json({ success: true, item: { ...item, quantity: newQuantity } });
  } catch (error) {
    console.error('HA update error:', error);
    res.status(500).json({ error: 'HA update failed' });
  }
});

app.post('/api/scan/mhd', largeBody, async (req, res) => {
  if (!checkRateLimit(req.ip || 'unknown')) return res.status(429).json({ error: 'Rate limit exceeded. Try again in a minute.' });
  const { imageBase64 } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

  try {
    const prompt = 'Extract the expiry date (MHD - Mindesthaltbarkeitsdatum) from this image. Return a JSON object with key "expiry_date" (format YYYY-MM-DD) or null if not found. Only return a date if you are very sure.';
    
    const schema = {
      type: Type.OBJECT,
      properties: {
        expiry_date: { type: Type.STRING, description: "YYYY-MM-DD format or null" }
      },
      required: ["expiry_date"]
    };

    const result = await getAIResponse(prompt, imageBase64, schema);
    res.json(result);
  } catch (error) {
    console.error('MHD AI Scan error:', error);
    res.status(500).json({ error: 'Failed to analyze MHD' });
  }
});

app.post('/api/scan', largeBody, async (req, res) => {
  if (!checkRateLimit(req.ip || 'unknown')) return res.status(429).json({ error: 'Rate limit exceeded. Try again in a minute.' });
  const { imageBase64 } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

  try {
    const prompt = 'Analyze this image of a food product, barcode, or label. 1. Identify the product name. IMPORTANT: Remove brand names (e.g., "Iglo", "Barilla", "Gut & Günstig") but KEEP the variant/type (e.g., "Rahmspinat", "Lasagne", "Dunkler Saucenbinder", "Hähnchenschnitzel"). Example: "Iglo Rahmspinat Blubb" -> "Rahmspinat". "Knorr Saucenbinder Dunkel" -> "Dunkler Saucenbinder". 2. Determine a generic_name for grouping (e.g., "Rahmspinat (TK)"). IMPORTANT: For spices, seasonings, and spice mixes, the generic_name MUST be the specific spice/mix name (e.g., "Curry gemahlen", "Magic Dust", "Burger Gewürz"). NEVER use generic terms like "Gewürzmischung", "Spice Mix", or "Seasoning" as generic_name. 3. If a barcode is visible, try to decode it. 4. Estimate the CONTENT quantity and unit — always use the actual content unit, never "Packung". A 2L bottle = quantity:2000 unit:"ml". A 500g pack of pasta = quantity:500 unit:"g". A pack of 10 eggs = quantity:10 unit:"Stück". For spices/oils where exact weight is hard to track, use quantity:100 unit:"%". 5. Identify an expiry date if visible (YYYY-MM-DD). ONLY return a date if you are VERY sure. If unsure or not visible, return null. 6. Estimate the price in EUR if visible or common. 7. Suggest a storage location (e.g., Fridge, Freezer, Pantry). Return a JSON object with keys: name (string), generic_name (string), quantity (number), unit (string), category (string), expiry_date (string or null), price (number or null), location (string). The category MUST be one of: "Obst & Gemüse", "Kühlregal", "Tiefkühl", "Vorratsschrank", "Getränke", "Backwaren", "Fleisch & Fisch", "Snacks & Süßigkeiten", "Gewürze & Saucen", "Haushalt & Drogerie", "Sonstiges". The unit MUST be one of: "Stück", "g", "kg", "ml", "l", "%".';

    const schema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        generic_name: { type: Type.STRING },
        quantity: { type: Type.NUMBER },
        unit: { type: Type.STRING, enum: ["Stück", "g", "kg", "ml", "l", "%"] },
        category: { type: Type.STRING, enum: ["Obst & Gemüse", "Kühlregal", "Tiefkühl", "Vorratsschrank", "Getränke", "Backwaren", "Fleisch & Fisch", "Snacks & Süßigkeiten", "Gewürze & Saucen", "Haushalt & Drogerie", "Sonstiges"] },
        expiry_date: { type: Type.STRING, description: "YYYY-MM-DD format or null" },
        price: { type: Type.NUMBER },
        location: { type: Type.STRING }
      },
      required: ["name", "generic_name", "quantity", "unit", "category"]
    };
    const result = await getAIResponse(prompt, imageBase64, schema);
    res.json(result);
  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ error: 'Failed to analyze image' });
  }
});

app.post('/api/cook/analyze-photo', largeBody, async (req, res) => {
  if (!checkRateLimit(req.ip || 'unknown')) return res.status(429).json({ error: 'Rate limit exceeded. Try again in a minute.' });
  const { imageBase64 } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

  try {
    const items = db.prepare('SELECT id, generic_name, name, quantity, unit, category FROM items WHERE quantity > 0').all();
    const inventoryList = items.map((i: any) => `ID: ${i.id} | ${i.generic_name || i.name} (${i.quantity} ${i.unit})`).join('\n');
    
    const prompt = `
      Analyze this image of food ingredients that the user is about to cook.
      Match the visible ingredients with the following inventory list:
      ${inventoryList}
      
      For each matched ingredient, estimate how much the user is likely to use for a typical meal (or based on what's visible).
      If it's a full package of pasta, maybe they use 250g or 500g. If it's a can of tomatoes, maybe 100% (the whole can).
      If it's a single piece of vegetable (like an onion), maybe 1 Stück.
      
      Return a JSON object with a key "ingredients" containing an array of objects:
      - id: The ID from the inventory list
      - name: The name of the ingredient
      - unit: The unit from the inventory list
      - estimated_deduction: A number representing the estimated amount to deduct
      - reasoning: A short explanation of why this amount (e.g., "Standard portion for 2 people" or "Whole can visible")
    `;
    
    const schema = {
      type: Type.OBJECT,
      properties: {
        ingredients: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              name: { type: Type.STRING },
              unit: { type: Type.STRING },
              estimated_deduction: { type: Type.NUMBER },
              reasoning: { type: Type.STRING }
            },
            required: ["id", "name", "unit", "estimated_deduction", "reasoning"]
          }
        }
      },
      required: ["ingredients"]
    };

    const result = await getAIResponse(prompt, imageBase64, schema);
    res.json(result);
  } catch (error) {
    console.error('Analyze cook photo error:', error);
    res.status(500).json({ error: 'Failed to analyze photo' });
  }
});

app.post('/api/cook/ask-amounts', async (req, res) => {
  if (!checkRateLimit(req.ip || 'unknown')) return res.status(429).json({ error: 'Rate limit exceeded. Try again in a minute.' });
  const { ingredients, portions } = req.body;
  try {
    const prompt = `
      I am cooking a meal with the following ingredients:
      ${ingredients.map((i: any) => `- ${i.name} (Available: ${i.available} ${i.unit})`).join('\n')}
      
      How much of each ingredient should I use for ${portions || 2} portions to make a balanced meal?
      Return a JSON object with a key "advice" containing a short text advice, and "amounts" containing an array of objects with "id" and "suggested_amount".
    `;
    
    const schema = {
      type: Type.OBJECT,
      properties: {
        advice: { type: Type.STRING },
        amounts: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              suggested_amount: { type: Type.NUMBER }
            },
            required: ["id", "suggested_amount"]
          }
        }
      },
      required: ["advice", "amounts"]
    };

    const result = await getAIResponse(prompt, undefined, schema, true);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get advice' });
  }
});

app.post('/api/cook/check-opened', async (req, res) => {
  if (!checkRateLimit(req.ip || 'unknown')) return res.status(429).json({ error: 'Rate limit exceeded. Try again in a minute.' });
  const { deductions, recipeId } = req.body;

  try {
    let itemsToCheck: any[] = [];
    
    if (recipeId) {
      // Calculate deductions for recipe
      const recipe = db.prepare('SELECT * FROM planned_recipes WHERE id = ?').get(recipeId) as any;
      if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
      
      const ingredients = JSON.parse(recipe.ingredients);
      const ratio = recipe.portions / recipe.base_portions;
      
      for (const ing of ingredients) {
        let deductAmount = 0;
        if (ing.unit !== '%') {
          deductAmount = ing.amount * ratio;
        } else {
          deductAmount = 5 * recipe.portions;
        }
        
        let remainingToDeduct = deductAmount;
        const rows = db.prepare(`SELECT * FROM items WHERE LOWER(name) LIKE LOWER(?) ESCAPE '\\' OR LOWER(?) LIKE LOWER('%' || name || '%') ORDER BY is_open DESC, expiry_date ASC`).all(`%${escapeLike(ing.name)}%`, ing.name) as any[];
        
        for (const item of rows) {
          if (remainingToDeduct <= 0) break;
          
          let take = 0;
          if (item.is_open) {
            take = Math.min(item.quantity, remainingToDeduct);
          } else {
             const pkgSize = item.package_size || item.quantity;
             if (remainingToDeduct >= item.quantity) {
               take = item.quantity;
             } else {
               // Partial open
               let packagesToOpen = Math.ceil(remainingToDeduct / pkgSize);
               let totalOpenedAmount = packagesToOpen * pkgSize;
               
               if (totalOpenedAmount > item.quantity) {
                 totalOpenedAmount = item.quantity;
               }
               // We are interested if we are opening a package and NOT using it fully
               // If we open a package (totalOpenedAmount) and use remainingToDeduct
               // The leftover is totalOpenedAmount - remainingToDeduct
               
               if (totalOpenedAmount > remainingToDeduct) {
                 itemsToCheck.push({ id: item.id, name: item.name, category: item.category });
               }
               take = remainingToDeduct; // effectively we use this much
             }
          }
          remainingToDeduct -= take;
        }
      }
    } else if (deductions) {
      // Direct deductions (Free Cook)
      for (const d of deductions) {
        const item = db.prepare('SELECT * FROM items WHERE id = ?').get(d.id) as any;
        if (item && !item.is_open) {
           const pkgSize = item.package_size || item.quantity;
           // Logic: If we deduct less than the full quantity (or full package multiple), it's an open event
           // But wait, free cook usually deducts specific amounts.
           // If amount < quantity, it's a partial use.
           
           // Simplified check: If new quantity > 0 and we are deducting from a closed item
           // But we need to handle the "package" logic if applicable.
           // If unit is pieces/pack, and we deduct 0.5, it's partial.
           
           // Let's stick to the logic: If we are left with a positive quantity on a previously closed item.
           if (item.quantity > d.amount) {
              // Check if we are just taking full packages
              if (pkgSize && d.amount % pkgSize === 0) {
                // Taking full packages, no open
              } else {
                itemsToCheck.push({ id: item.id, name: item.name, category: item.category });
              }
           }
        }
      }
    }

    if (itemsToCheck.length === 0) {
      return res.json({ updates: [] });
    }

    // Ask AI
    const prompt = `
      The user has opened (partially consumed) the following food items:
      ${itemsToCheck.map(i => `ID: ${i.id}, Name: ${i.name}`).join('\n')}
      
      Which of these items spoil quickly after opening (within 2-5 days)?
      Examples for YES (spoil quickly): "Passierte Tomaten", "Streukäse", "Milch", "Sahne", "Würstchen im Glas", "Mais (Konserve)", "Bohnen".
      Examples for NO (last long): "Gewürzgurken", "Ketchup", "Senf", "Marmelade", "Reis", "Nudeln", "Mehl", "Essig", "Öl".
      
      Return a JSON object with a key "updates" containing an array of objects:
      - id: The item ID
      - needs_new_expiry: boolean (true if it spoils quickly)
      - days_until_spoiled: number (e.g., 3 for passierte Tomaten, null if needs_new_expiry is false)
    `;
    
    const schema = {
      type: Type.OBJECT,
      properties: {
        updates: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              needs_new_expiry: { type: Type.BOOLEAN },
              days_until_spoiled: { type: Type.NUMBER }
            },
            required: ["id", "needs_new_expiry"]
          }
        }
      },
      required: ["updates"]
    };

    const aiResult = await getAIResponse(prompt, undefined, schema, true);
    
    const updatesWithNames = aiResult?.updates?.map((u: any) => {
      const item = itemsToCheck.find(i => i.id === u.id);
      return { ...u, name: item?.name || 'Unbekannt' };
    }) || [];

    res.json({ updates: updatesWithNames });

  } catch (error) {
    console.error('Check opened error:', error);
    res.status(500).json({ error: 'Failed to check opened items' });
  }
});

app.post('/api/cook/deduct', async (req, res) => {
  const { deductions, openedUpdates } = req.body; // openedUpdates: [{ id, days }]
  try {
    db.transaction(() => {
      for (const d of deductions) {
        const item = db.prepare('SELECT * FROM items WHERE id = ?').get(d.id) as any;
        if (item) {
          if (item.is_open) {
            const newQuantity = Math.max(0, item.quantity - d.amount);
            db.prepare('UPDATE items SET quantity = ? WHERE id = ?').run(newQuantity, d.id);
          } else {
            const pkgSize = item.package_size || item.quantity;
            if (d.amount >= item.quantity) {
              db.prepare('UPDATE items SET quantity = 0 WHERE id = ?').run(item.id);
            } else {
              let packagesToOpen = Math.ceil(d.amount / pkgSize);
              let totalOpenedAmount = packagesToOpen * pkgSize;
              let leftoverOpened = totalOpenedAmount - d.amount;
              
              if (totalOpenedAmount > item.quantity) {
                totalOpenedAmount = item.quantity;
                leftoverOpened = totalOpenedAmount - d.amount;
              }
              
              db.prepare('UPDATE items SET quantity = quantity - ? WHERE id = ?').run(totalOpenedAmount, item.id);
              
              if (leftoverOpened > 0) {
                // Check if we have an update for this item
                const update = openedUpdates?.find((u: any) => u.id === item.id);
                let expiryDate = item.expiry_date;
                if (update) {
                  const newExpiry = new Date();
                  newExpiry.setDate(newExpiry.getDate() + update.days);
                  expiryDate = newExpiry.toISOString().split('T')[0];
                }
                
                db.prepare(`INSERT INTO items (name, generic_name, quantity, unit, expiry_date, category, barcode, pieces_per_pack, package_size, is_open, opened_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`).run(item.name, item.generic_name, leftoverOpened, item.unit, expiryDate, item.category, item.barcode, item.pieces_per_pack, pkgSize);
              }
            }
          }
        }
      }
      db.prepare('DELETE FROM items WHERE quantity <= 0').run();
    })();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deduct items' });
  }
});

app.post('/api/recipes/generate', async (req, res) => {
  if (!checkRateLimit(req.ip || 'unknown')) return res.status(429).json({ error: 'Rate limit exceeded. Try again in a minute.' });
  const { preferences, portions, allowExtra = false, maxExtraItems = 0 } = req.body;
  try {
    const items = db.prepare('SELECT generic_name, name, quantity, unit, expiry_date, category FROM items').all();
    
    // Group items by generic_name and unit, but keep track of open status and expiry
    const groupedInventory: Record<string, { quantity: number, unit: string, details: string[], category: string }> = {};
    
    items.forEach((i: any) => {
      const key = `${i.generic_name || i.name}_${i.unit}`;
      if (!groupedInventory[key]) {
        groupedInventory[key] = { quantity: 0, unit: i.unit, details: [], category: i.category };
      }
      groupedInventory[key].quantity += i.quantity;
      
      let detail = `${i.quantity} ${i.unit}`;
      if (i.is_open) detail += ' (geöffnet)';
      if (i.expiry_date) detail += ` MHD: ${i.expiry_date}`;
      groupedInventory[key].details.push(detail);
    });

    const inventoryList = Object.entries(groupedInventory).map(([key, data]) => {
      const name = key.split('_')[0];
      const detailsStr = data.details.join(', ');
      return `- ${name}: ${data.quantity} ${data.unit} gesamt [${detailsStr}]`;
    }).join('\n');
    
    const extraInstruction = allowExtra && maxExtraItems > 0
      ? `You MAY include up to ${maxExtraItems} additional ingredients NOT in the inventory if they significantly improve the recipe. Mark these with in_inventory: false.`
      : `Use ONLY ingredients from the inventory. Do NOT add ingredients that are not listed. All ingredients must have in_inventory: true.`;

    const prompt = `
      You are a professional chef. Create a recipe for ${portions || 2} portions using the following ingredients from my inventory:
      ${inventoryList}

      User preferences/Season: ${preferences || 'None'}
      PREFER ingredients that are expiring soon (MHD) or already opened, but do NOT force them into the recipe if they don't fit.
      Expired items (MHD in the past) should be treated as optional — only use them if the recipe genuinely benefits.
      Include available sauces and spices where they naturally fit.
      ${extraInstruction}

      Return a JSON object with:
      - title: Recipe title (German)
      - description: Short description (German)
      - ingredients: Array of objects { name, amount, unit, in_inventory (boolean) }
      - instructions: Array of strings (steps, in German)
    `;

    const schema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        ingredients: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              unit: { type: Type.STRING },
              in_inventory: { type: Type.BOOLEAN }
            },
            required: ["name", "amount", "unit", "in_inventory"]
          }
        },
        instructions: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
      required: ["title", "description", "ingredients", "instructions"]
    };

    const result = await getAIResponse(prompt, undefined, schema);
    res.json(result);
  } catch (error) {
    console.error('Recipe error:', error);
    res.status(500).json({ error: 'Failed to generate recipe' });
  }
});

app.get('/api/calendar', (req, res) => {
  try {
    const recipes = db.prepare('SELECT * FROM planned_recipes ORDER BY date ASC').all();
    res.json(recipes.map((r: any) => ({
      ...r,
      ingredients: JSON.parse(r.ingredients),
      instructions: JSON.parse(r.instructions),
      cooked: r.cooked === 1
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch calendar' });
  }
});

app.post('/api/calendar', (req, res) => {
  const { date, title, description, ingredients, instructions, portions, base_portions } = req.body;
  try {
    const stmt = db.prepare('INSERT INTO planned_recipes (date, title, description, ingredients, instructions, portions, base_portions) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(date, title, description, JSON.stringify(ingredients), JSON.stringify(instructions), portions, base_portions || portions);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add to calendar' });
  }
});

app.post('/api/calendar/week', (req, res) => {
  const { startDate, recipes, portions } = req.body;
  try {
    const stmt = db.prepare('INSERT INTO planned_recipes (date, title, description, ingredients, instructions, portions, base_portions) VALUES (?, ?, ?, ?, ?, ?, ?)');
    db.transaction(() => {
      // In the new schema, r.date is explicitly provided by the AI prompt
      recipes.forEach((r: any, index: number) => {
        // Fallback for old requests without specific dates
        const recipeDate = r.date || (startDate ? new Date(new Date(startDate).getTime() + index * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        const recipePortions = r.portions || portions || 2;
        stmt.run(recipeDate, r.title, r.description, JSON.stringify(r.ingredients), JSON.stringify(r.instructions), recipePortions, recipePortions);
      });
    })();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add week to calendar' });
  }
});

app.put('/api/calendar/:id/cook', async (req, res) => {
  const { id } = req.params;
  const { openedUpdates } = req.body; // [{ id, days }]

  try {
    const recipe = db.prepare('SELECT * FROM planned_recipes WHERE id = ?').get(id) as any;
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    const ingredients = JSON.parse(recipe.ingredients);
    const ratio = recipe.portions / recipe.base_portions;
    const deducted: any[] = [];
    const missing: string[] = [];

    db.transaction(() => {
      for (const ing of ingredients) {
        let reqAmt = ing.amount * ratio;
        if (ing.unit === '%') reqAmt = 5 * recipe.portions;
        
        const smallestReq = convertToSmallestUnit(reqAmt, ing.unit);
        let remainingToDeduct = smallestReq.amount;
        
        const rows = db.prepare(`SELECT * FROM items WHERE (LOWER(name) LIKE LOWER(?) ESCAPE '\\' OR LOWER(?) LIKE LOWER('%' || name || '%')) AND quantity > 0 ORDER BY is_open DESC, expiry_date ASC`).all(`%${escapeLike(ing.name)}%`, ing.name) as any[];
        
        const matchingRows = rows.filter(row => {
          const invSmallest = convertToSmallestUnit(row.quantity, row.unit);
          return invSmallest.unit === smallestReq.unit;
        });

        if (matchingRows.length > 0) {
          for (const item of matchingRows) {
            if (remainingToDeduct <= 0) break;
            
            const itemSmallest = convertToSmallestUnit(item.quantity, item.unit);
            const pkgSizeSmallest = convertToSmallestUnit(item.package_size || item.quantity, item.unit);

            if (item.is_open) {
              const take = Math.min(itemSmallest.amount, remainingToDeduct);
              remainingToDeduct -= take;
              // Convert back to original unit for DB update
              const newQty = (itemSmallest.amount - take) / (itemSmallest.amount / item.quantity);
              db.prepare('UPDATE items SET quantity = ? WHERE id = ?').run(newQty, item.id);
              deducted.push({ ...item, quantity_deducted_smallest: take });
            } else {
              if (remainingToDeduct >= itemSmallest.amount) {
                remainingToDeduct -= itemSmallest.amount;
                db.prepare('UPDATE items SET quantity = 0 WHERE id = ?').run(item.id);
                deducted.push({ ...item, quantity_deducted_smallest: itemSmallest.amount });
              } else {
                let packagesToOpen = Math.ceil(remainingToDeduct / pkgSizeSmallest.amount);
                let totalOpenedSmallest = packagesToOpen * pkgSizeSmallest.amount;
                let leftoverSmallest = totalOpenedSmallest - remainingToDeduct;
                
                if (totalOpenedSmallest > itemSmallest.amount) {
                  totalOpenedSmallest = itemSmallest.amount;
                  leftoverSmallest = totalOpenedSmallest - remainingToDeduct;
                }
                
                const newQty = (itemSmallest.amount - totalOpenedSmallest) / (itemSmallest.amount / item.quantity);
                db.prepare('UPDATE items SET quantity = ? WHERE id = ?').run(newQty, item.id);
                deducted.push({ ...item, quantity_deducted_smallest: remainingToDeduct });
                
                if (leftoverSmallest > 0) {
                  const update = openedUpdates?.find((u: any) => u.id === item.id);
                  let expiryDate = item.expiry_date;
                  if (update) {
                    const newExpiry = new Date();
                    newExpiry.setDate(newExpiry.getDate() + update.days);
                    expiryDate = newExpiry.toISOString().split('T')[0];
                  }

                  const leftoverQty = leftoverSmallest / (pkgSizeSmallest.amount / (item.package_size || item.quantity));
                  db.prepare(`INSERT INTO items (name, generic_name, quantity, unit, expiry_date, category, barcode, pieces_per_pack, package_size, is_open, opened_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`).run(item.name, item.generic_name, leftoverQty, item.unit, expiryDate, item.category, item.barcode, item.pieces_per_pack, item.package_size || item.quantity);
                }
                remainingToDeduct = 0;
              }
            }
          }
          if (remainingToDeduct > 0) {
            let displayMissing = remainingToDeduct;
            let displayUnit = smallestReq.unit;
            if (displayUnit === 'g' && displayMissing >= 1000) { displayMissing /= 1000; displayUnit = 'kg'; }
            if (displayUnit === 'ml' && displayMissing >= 1000) { displayMissing /= 1000; displayUnit = 'l'; }
            missing.push(`${ing.name} (Fehlt: ${Math.round(displayMissing * 100) / 100} ${displayUnit})`);
          }
        } else {
          missing.push(ing.name);
        }
      }
      db.prepare('DELETE FROM items WHERE quantity <= 0').run();
      db.prepare('UPDATE planned_recipes SET cooked = 1 WHERE id = ?').run(id);
    })();

    res.json({ success: true, deducted, missing });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to mark as cooked' });
  }
});

app.delete('/api/calendar/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM planned_recipes WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

app.put('/api/calendar/:id/portions', (req, res) => {
  const { id } = req.params;
  const { portions } = req.body;
  try {
    db.prepare('UPDATE planned_recipes SET portions = ? WHERE id = ?').run(portions, id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update portions' });
  }
});

// --- Favorite Recipes ---
// --- Recipe Import from URL ---
app.post('/api/recipes/import', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'No URL provided' });

  try {
    // Fetch the webpage
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FoodAI/1.0)' }
    });
    if (!response.ok) throw new Error('Failed to fetch URL: ' + response.status);

    const html = await response.text();

    // Extract text content (strip HTML tags, limit size for AI)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000);

    // Also try to extract JSON-LD recipe schema
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
    let schemaRecipe = '';
    if (jsonLdMatch) {
      for (const match of jsonLdMatch) {
        const jsonStr = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
        try {
          const parsed = JSON.parse(jsonStr);
          const recipe = Array.isArray(parsed) ? parsed.find((p: any) => p['@type'] === 'Recipe') : (parsed['@type'] === 'Recipe' ? parsed : null);
          if (recipe) {
            schemaRecipe = JSON.stringify(recipe).slice(0, 4000);
            break;
          }
        } catch {}
      }
    }

    const lang = (db.prepare("SELECT value FROM settings WHERE key = 'language'").get() as any)?.value || 'de';
    const langName = lang === 'de' ? 'German' : lang === 'es' ? 'Spanish' : 'English';

    const prompt = `Extract a recipe from this webpage content. ${schemaRecipe ? 'JSON-LD Schema found: ' + schemaRecipe : ''}\n\nPage text: ${textContent}\n\nReturn a JSON object with:\n- title: Recipe title (in ${langName})\n- description: Short description (in ${langName})\n- ingredients: Array of { name (${langName}, clean name without parentheses like "(n)" or "(s)"), amount (number, MUST be > 0. For vague amounts like "etwas", "nach Geschmack", "n.B." use 1. For "eine Prise" use 1.), unit (string — use "Stück", "g", "kg", "ml", "l", "EL", "TL", "Prise", "Bund"), in_inventory: false }\n- instructions: Array of step strings (in ${langName})\n\nIMPORTANT: Every ingredient MUST have amount > 0 and a clean name. Never return amount 0.\n\nIf the page is not a recipe, return { "error": "No recipe found" }.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        error: { type: Type.STRING },
        ingredients: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              unit: { type: Type.STRING },
              in_inventory: { type: Type.BOOLEAN }
            },
            required: ["name", "amount", "unit", "in_inventory"]
          }
        },
        instructions: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["title"]
    };

    const result = await getAIResponse(prompt, undefined, schema);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    // Check which ingredients are in inventory using alias map
    const items = db.prepare('SELECT name, generic_name, quantity, unit FROM items WHERE quantity > 0').all() as any[];
    const normalize = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, '').replace(/[,\.]/g, '').replace(/\s+/g, ' ').trim();

    // Load ingredient alias map
    let aliasMap: Record<string, string[]> = {};
    try { aliasMap = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'data', 'ingredient-aliases.json'), 'utf-8')); } catch {}
    // Fallback: try dist location
    if (Object.keys(aliasMap).length === 0) {
      try { aliasMap = JSON.parse(fs.readFileSync(path.join(__dirname, 'ingredient-aliases.json'), 'utf-8')); } catch {}
    }

    // Build reverse lookup: alias → canonical name
    const aliasLookup: Record<string, string> = {};
    for (const [canonical, aliases] of Object.entries(aliasMap)) {
      for (const alias of aliases) {
        aliasLookup[alias] = canonical.toLowerCase();
      }
      aliasLookup[canonical.toLowerCase()] = canonical.toLowerCase();
    }

    const getCanonicals = (name: string): string[] => {
      const n = normalize(name);
      const results = new Set<string>();
      results.add(n);
      // Exact alias match
      if (aliasLookup[n]) results.add(aliasLookup[n]);
      // First word match
      const firstWord = n.split(' ')[0];
      if (aliasLookup[firstWord]) results.add(aliasLookup[firstWord]);
      // Partial match — only if alias is a meaningful substring of the name (not vice versa)
      for (const [alias, canonical] of Object.entries(aliasLookup)) {
        if (alias.length >= 4 && n.includes(alias)) {
          results.add(canonical);
        }
      }
      return Array.from(results);
    };

    if (result.ingredients) {
      for (const ing of result.ingredients) {
        const ingCanonicals = getCanonicals(ing.name);
        const match = items.find((item: any) => {
          const itemCanonicals = getCanonicals(item.name);
          const genericCanonicals = item.generic_name ? getCanonicals(item.generic_name) : [];
          const allItemCanonicals = new Set([...itemCanonicals, ...genericCanonicals]);
          return ingCanonicals.some(ic => allItemCanonicals.has(ic));
        });
        ing.in_inventory = !!match;
      }
    }

    res.json(result);
  } catch (error: any) {
    console.error('Recipe import error:', error);
    res.status(500).json({ error: 'Failed to import recipe: ' + (error.message || 'Unknown error') });
  }
});

// --- Voice API for HA integration ---
app.get('/api/voice/expiring', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const threeDays = new Date();
    threeDays.setDate(threeDays.getDate() + 3);
    const threeDaysStr = threeDays.toISOString().split('T')[0];

    const items = db.prepare('SELECT name, expiry_date, quantity, unit FROM items WHERE expiry_date <= ? AND expiry_date >= ? AND quantity > 0 ORDER BY expiry_date ASC').all(threeDaysStr, today) as any[];
    const expired = db.prepare('SELECT name, expiry_date FROM items WHERE expiry_date < ? AND quantity > 0 ORDER BY expiry_date ASC').all(today) as any[];

    const lang = (req.query.lang as string) || 'de';
    let text = '';

    if (lang === 'de') {
      if (expired.length > 0) {
        text += 'Bereits abgelaufen: ' + expired.map((i: any) => i.name).join(', ') + '. ';
      }
      if (items.length > 0) {
        text += 'Bald ablaufend: ' + items.map((i: any) => {
          const days = Math.ceil((new Date(i.expiry_date).getTime() - new Date().getTime()) / 86400000);
          return i.name + (days <= 0 ? ' (heute)' : days === 1 ? ' (morgen)' : ` (in ${days} Tagen)`);
        }).join(', ') + '.';
      }
      if (!text) text = 'Alles in Ordnung, nichts läuft bald ab.';
    } else {
      if (expired.length > 0) {
        text += 'Already expired: ' + expired.map((i: any) => i.name).join(', ') + '. ';
      }
      if (items.length > 0) {
        text += 'Expiring soon: ' + items.map((i: any) => {
          const days = Math.ceil((new Date(i.expiry_date).getTime() - new Date().getTime()) / 86400000);
          return i.name + (days <= 0 ? ' (today)' : days === 1 ? ' (tomorrow)' : ` (in ${days} days)`);
        }).join(', ') + '.';
      }
      if (!text) text = 'All good, nothing expiring soon.';
    }

    res.json({ text, expired_count: expired.length, expiring_count: items.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expiring items' });
  }
});

app.get('/api/voice/inventory-summary', (req, res) => {
  try {
    const totalItems = (db.prepare('SELECT COUNT(*) as cnt FROM items WHERE quantity > 0').get() as any)?.cnt || 0;
    const openItems = (db.prepare('SELECT COUNT(*) as cnt FROM items WHERE is_open = 1 AND quantity > 0').get() as any)?.cnt || 0;
    const totalValue = (db.prepare('SELECT SUM(price * quantity) as value FROM items WHERE price IS NOT NULL').get() as any)?.value || 0;
    const categories = db.prepare('SELECT category, COUNT(*) as cnt FROM items WHERE quantity > 0 GROUP BY category ORDER BY cnt DESC').all() as any[];

    const lang = (req.query.lang as string) || 'de';
    let text = '';
    if (lang === 'de') {
      text = `Du hast ${totalItems} Packungen im Vorrat, davon ${openItems} geöffnet. Gesamtwert: ${totalValue.toFixed(2)} Euro. `;
      text += 'Kategorien: ' + categories.map((c: any) => `${c.category} (${c.cnt})`).join(', ') + '.';
    } else {
      text = `You have ${totalItems} packages in stock, ${openItems} opened. Total value: ${totalValue.toFixed(2)} EUR. `;
      text += 'Categories: ' + categories.map((c: any) => `${c.category} (${c.cnt})`).join(', ') + '.';
    }

    res.json({ text, total_items: totalItems, open_items: openItems, total_value: totalValue });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory summary' });
  }
});

app.get('/api/recipes/favorites', (req, res) => {
  try {
    const favorites = db.prepare('SELECT * FROM favorite_recipes ORDER BY created_at DESC').all();
    res.json(favorites.map((f: any) => ({
      ...f,
      ingredients: JSON.parse(f.ingredients),
      instructions: JSON.parse(f.instructions)
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

app.post('/api/recipes/favorites', (req, res) => {
  const { title, description, ingredients, instructions, portions } = req.body;
  try {
    const stmt = db.prepare('INSERT INTO favorite_recipes (title, description, ingredients, instructions, portions) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(title, description, JSON.stringify(ingredients), JSON.stringify(instructions), portions || 2);
    res.json({ id: info.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save favorite' });
  }
});

app.delete('/api/recipes/favorites/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM favorite_recipes WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete favorite' });
  }
});

app.post('/api/recipes/cook', (req, res) => {
  const { usedIngredients } = req.body;
  const deducted: any[] = [];
  const missing: string[] = [];

  try {
    db.transaction(() => {
      for (const ing of usedIngredients) {
        const item = db.prepare("SELECT * FROM items WHERE name LIKE ? ESCAPE '\\' LIMIT 1").get(`%${escapeLike(ing.name)}%`) as any;
        if (item) {
          if (item.quantity >= ing.amount) {
            const newQty = item.quantity - ing.amount;
            db.prepare('UPDATE items SET quantity = ? WHERE id = ?').run(newQty, item.id);
            deducted.push({ ...item, quantity_deducted: ing.amount });
          } else {
            db.prepare('UPDATE items SET quantity = 0 WHERE id = ?').run(item.id);
            deducted.push({ ...item, quantity_deducted: item.quantity });
            missing.push(`${ing.name} (Fehlt: ${ing.amount - item.quantity} ${ing.unit || item.unit || ''})`.trim());
          }
        } else {
          missing.push(ing.name);
        }
      }
      db.prepare('DELETE FROM items WHERE quantity <= 0').run();
    })();
    res.json({ success: true, deducted, missing });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deduct inventory' });
  }
});

app.get('/api/settings', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM settings').all();
    const result = settings.reduce((acc: any, row: any) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    const defaults = {
      ai_provider: 'gemini',
      ai_model: 'gemini-3-flash-preview',
      ollama_url: 'http://localhost:11434'
    };

    const merged = { ...defaults, ...result };

    // Mask sensitive values — never return partial values
    const sensitiveKeys = ['ai_api_key', 'bring_password', 'bring_email'];
    for (const key of sensitiveKeys) {
      if (merged[key]) {
        merged[key + '_set'] = true;
        merged[key] = '••••••••';
      }
    }

    res.json(merged);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.post('/api/settings/bulk', (req, res) => {
  const { settings } = req.body;
  if (!settings) return res.status(400).json({ error: 'No settings provided' });
  try {
    const insert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const SENSITIVE_KEYS = ['ai_api_key', 'bring_password', 'bring_email'];
    const transaction = db.transaction((data) => {
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined && value !== null) {
          if (!ALLOWED_SETTINGS.includes(key)) continue;
          // Skip masked values — don't overwrite real secrets with ••••••••
          if (SENSITIVE_KEYS.includes(key) && String(value).includes('••••')) continue;
          insert.run(key, String(value));
        }
      }
    });
    transaction(settings);
    res.json({ success: true });
  } catch (error) {
    console.error('Settings save error:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

app.post('/api/settings', (req, res) => {
  const { key, value } = req.body;
  if (!ALLOWED_SETTINGS.includes(key)) {
    return res.status(400).json({ error: `Invalid setting key: ${key}` });
  }
  try {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

app.post('/api/bring/add', async (req, res) => {
  const { items } = req.body;
  try {
    const emailRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('bring_email') as any;
    const passRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('bring_password') as any;
    
    if (!emailRow || !passRow) {
      return res.status(400).json({ error: 'Bring! credentials not configured in settings.' });
    }

    console.log(`Adding ${items.length} items to Bring list`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    res.json({ success: true, message: `Added ${items.length} items to Bring!` });
  } catch (error) {
    console.error('Bring API error:', error);
    res.status(500).json({ error: 'Failed to add to Bring list' });
  }
});

// --- Food Inspiration RSS Feed ---
const rssParser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media:content', { keepArray: true }],
      ['media:thumbnail', 'media:thumbnail'],
      ['enclosure', 'enclosure'],
    ]
  }
});

let feedCache: { items: any[]; fetchedAt: number; lang: string } | null = null;
const FEED_CACHE_TTL = 3600000; // 1 hour

function extractImage(item: any): string | null {
  if (item.enclosure?.url) return item.enclosure.url;
  if (item['media:content']?.[0]?.$?.url) return item['media:content'][0].$.url;
  if (item['media:thumbnail']?.$?.url) return item['media:thumbnail'].$.url;
  const match = (item['content:encoded'] || item.content || '').match(/<img[^>]+src="([^"]+)"/);
  if (match) return match[1];
  return null;
}

app.get('/api/feed/inspiration', async (req, res) => {
  try {
    const lang = (req.query.lang as string) || 'de';
    const now = Date.now();

    if (feedCache && feedCache.lang === lang && (now - feedCache.fetchedAt) < FEED_CACHE_TTL) {
      return res.json(feedCache.items);
    }

    // Try multiple RSS feeds for more items
    const feedUrls = lang === 'de'
      ? ['https://www.gutekueche.de/feed/tagesrezept', 'https://www.gutekueche.de/feed/wochenrezepte']
      : ['https://www.bbcgoodfood.com/feed'];

    let items: any[] = [];
    for (const feedUrl of feedUrls) {
      try {
        const feed = await rssParser.parseURL(feedUrl);
        const newItems = feed.items.slice(0, 6).map(item => ({
          title: item.title || '',
          link: item.link || '',
          image: extractImage(item),
          pubDate: item.pubDate || '',
          snippet: (item.contentSnippet || '').slice(0, 150),
        }));
        items.push(...newItems);
      } catch (e) {
        console.error('RSS fetch error:', e);
      }
      if (items.length >= 6) break;
    }

    // Deduplicate by title
    items = items.filter((item, idx, arr) => arr.findIndex(i => i.title === item.title) === idx);

    // Fill up to 3 with TheMealDB if needed
    while (items.length < 3) {
      try {
        const r = await fetch('https://www.themealdb.com/api/json/v1/1/random.php');
        const data = await r.json();
        const meal = data.meals?.[0];
        if (meal && !items.some(i => i.title === meal.strMeal)) {
          items.push({
            title: meal.strMeal,
            link: 'https://www.themealdb.com/meal/' + meal.idMeal,
            image: meal.strMealThumb,
            pubDate: new Date().toISOString(),
            snippet: meal.strCategory + ' · ' + meal.strArea,
          });
        }
      } catch { break; }
    }

    items = items.slice(0, 6);

    feedCache = { items, fetchedAt: now, lang };
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  // Mirror display route — standalone dark page, no React/Navbar
  app.get('/mirror/today', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Service-Worker-Allowed', 'none');
    try {
      const today = new Date().toISOString().split('T')[0];
      const recipes = db.prepare('SELECT * FROM planned_recipes WHERE date = ? AND cooked = 0 ORDER BY id ASC').all(today) as any[];

      let recipeHtml = '';
      if (recipes.length === 0) {
        recipeHtml = '<div class="empty"><div class="icon">🍽️</div><p>Kein Rezept für heute geplant</p></div>';
      } else {
        for (const r of recipes) {
          const ingredients = JSON.parse(r.ingredients);
          const instructions = JSON.parse(r.instructions);
          recipeHtml += `
            <div class="recipe">
              <h1>${escapeHtml(r.title)}</h1>
              <p class="desc">${escapeHtml(r.description || '')}</p>
              <div class="meta">${escapeHtml(String(r.portions))} Portionen</div>
              <div class="columns">
                <div class="col">
                  <h2>Zutaten</h2>
                  <ul>${ingredients.map((i: any) => `<li><span class="amount">${escapeHtml(String(i.amount))} ${escapeHtml(i.unit)}</span> ${escapeHtml(i.name)} ${i.in_inventory ? '<span class="ok">&#x2713;</span>' : '<span class="missing">&#x2717;</span>'}</li>`).join('')}</ul>
                </div>
                <div class="col">
                  <h2>Zubereitung</h2>
                  <ol>${instructions.map((s: string) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
                </div>
              </div>
            </div>`;
        }
      }

      res.send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rezept des Tages</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #000; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px 60px; }
  .empty { text-align: center; padding: 200px 0; }
  .empty .icon { font-size: 80px; margin-bottom: 20px; }
  .empty p { font-size: 1.8em; color: #666; }
  .recipe { margin-bottom: 40px; }
  h1 { font-size: 2.8em; font-weight: 700; margin-bottom: 8px; text-shadow: 0 2px 12px rgba(255,255,255,0.1); }
  .desc { font-size: 1.2em; color: #aaa; margin-bottom: 16px; }
  .meta { font-size: 1em; color: #10b981; font-weight: 600; margin-bottom: 30px; padding: 8px 16px; background: rgba(16,185,129,0.1); border-radius: 12px; display: inline-block; border: 1px solid rgba(16,185,129,0.2); }
  .columns { display: flex; gap: 60px; }
  .col { flex: 1; }
  h2 { font-size: 1em; text-transform: uppercase; letter-spacing: 3px; color: #888; margin-bottom: 20px; padding-bottom: 8px; border-bottom: 1px solid #333; }
  ul, ol { list-style: none; }
  ul li { padding: 8px 0; border-bottom: 1px solid #1a1a1a; font-size: 1.1em; display: flex; align-items: center; gap: 8px; }
  ol li { padding: 12px 0; border-bottom: 1px solid #1a1a1a; font-size: 1.05em; counter-increment: step; display: flex; gap: 12px; }
  ol li::before { content: counter(step); flex-shrink: 0; width: 28px; height: 28px; background: #1a1a1a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8em; font-weight: 700; color: #666; }
  ol { counter-reset: step; }
  .amount { color: #10b981; font-weight: 700; min-width: 80px; }
  .ok { color: #10b981; }
  .missing { color: #ef4444; }
</style></head><body>${recipeHtml}</body></html>`);
    } catch (error) {
      res.status(500).send('Error loading recipe');
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    // already handled above
  } else {
    // SPA fallback: all non-API/mirror routes serve index.html
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/mirror/')) return next();
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  // HTTPS with self-signed cert for camera access on mobile
  const certDir = process.env.DB_DIR || process.cwd();
  const keyPath = path.join(certDir, 'server.key');
  const certPath = path.join(certDir, 'server.cert');

  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.log('Generating self-signed certificate...');
    const { execFileSync } = await import('child_process');
    execFileSync('openssl', [
      'req', '-x509', '-newkey', 'rsa:2048',
      '-keyout', keyPath, '-out', certPath,
      '-days', '3650', '-nodes', '-subj', '/CN=foodai'
    ], { stdio: 'pipe' });
  }

  const sslOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };

  https.createServer(sslOptions, app).listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on https://0.0.0.0:${PORT}`);
  });

  // HTTP on port 3001 for local iframe embedding (MagicMirror)
  const HTTP_PORT = parseInt(process.env.HTTP_PORT || '3001');
  http.createServer(app).listen(HTTP_PORT, '127.0.0.1', () => {
    console.log(`HTTP server on http://127.0.0.1:${HTTP_PORT} (for local iframe embedding)`);
  });
}

startServer();

  const certDir = process.env.DB_DIR || process.cwd();
  const keyPath = path.join(certDir, 'server.key');
  const certPath = path.join(certDir, 'server.cert');

  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.log('Generating self-signed certificate...');
    const { execFileSync } = await import('child_process');
    execFileSync('openssl', [
      'req', '-x509', '-newkey', 'rsa:2048',
      '-keyout', keyPath, '-out', certPath,
      '-days', '3650', '-nodes', '-subj', '/CN=foodai'
    ], { stdio: 'pipe' });
  }

  const sslOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };

  https.createServer(sslOptions, app).listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on https://0.0.0.0:${PORT}`);
  });

  // HTTP on port 3001 for local iframe embedding (MagicMirror)
  const HTTP_PORT = parseInt(process.env.HTTP_PORT || '3001');
  http.createServer(app).listen(HTTP_PORT, '127.0.0.1', () => {
    console.log(`HTTP server on http://127.0.0.1:${HTTP_PORT} (for local iframe embedding)`);
  });
}

startServer();
