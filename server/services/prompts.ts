import { Type } from '@google/genai';

export const SCAN_PROMPT = 'Analyze this image of a food product, barcode, or label. 1. Identify the product name. IMPORTANT: Remove brand names (e.g., "Iglo", "Barilla", "Gut & Günstig") but KEEP the variant/type (e.g., "Rahmspinat", "Lasagne", "Dunkler Saucenbinder", "Hähnchenschnitzel"). Example: "Iglo Rahmspinat Blubb" -> "Rahmspinat". "Knorr Saucenbinder Dunkel" -> "Dunkler Saucenbinder". 2. Determine a generic_name for grouping (e.g., "Rahmspinat (TK)"). IMPORTANT: For spices, seasonings, and spice mixes, the generic_name MUST be the specific spice/mix name (e.g., "Curry gemahlen", "Magic Dust", "Burger Gewürz"). NEVER use generic terms like "Gewürzmischung", "Spice Mix", or "Seasoning" as generic_name. 3. If a barcode is visible, try to decode it. 4. Estimate the CONTENT quantity and unit — always use the actual content unit, never "Packung". A 2L bottle = quantity:2000 unit:"ml". A 500g pack of pasta = quantity:500 unit:"g". A pack of 10 eggs = quantity:10 unit:"Stück". For spices/oils where exact weight is hard to track, use quantity:100 unit:"%". 5. Identify an expiry date if visible (YYYY-MM-DD). ONLY return a date if you are VERY sure. If unsure or not visible, return null. 6. Estimate the price in EUR if visible or common. 7. Suggest a storage location (e.g., Fridge, Freezer, Pantry). Return a JSON object with keys: name (string), generic_name (string), quantity (number), unit (string), category (string), expiry_date (string or null), price (number or null), location (string). The category MUST be one of: "Obst & Gemüse", "Kühlregal", "Tiefkühl", "Vorratsschrank", "Getränke", "Backwaren", "Fleisch & Fisch", "Snacks & Süßigkeiten", "Gewürze & Saucen", "Haushalt & Drogerie", "Sonstiges". The unit MUST be one of: "Stück", "g", "kg", "ml", "l", "%".';

export const SCAN_SCHEMA = {
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

export const MHD_PROMPT = 'Extract the expiry date (MHD - Mindesthaltbarkeitsdatum) from this image. Return a JSON object with key "expiry_date" (format YYYY-MM-DD) or null if not found. Only return a date if you are very sure.';

export const MHD_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    expiry_date: { type: Type.STRING, description: "YYYY-MM-DD format or null" }
  },
  required: ["expiry_date"]
};
