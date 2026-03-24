# FoodAI Inventory Refactoring

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jede physische Packung als eigenes Inventar-Item tracken, bessere Kategoriezuordnung, "Nochmal scannen" nach Speichern.

**Architecture:** Backend (server.ts) wird angepasst um nie Items zu mergen sondern immer neue anzulegen. `package_size` speichert den Originalinhalt, `quantity` den aktuellen Rest. Frontend zeigt Items gruppiert nach `generic_name` mit Open/Closed Badge. Scanner bekommt "Nochmal scannen" Flow.

**Tech Stack:** TypeScript, Express, SQLite (better-sqlite3), React, Tailwind CSS

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `server.ts:404-420` | Modify | `mapCategory()` erweitern |
| `server.ts:655-681` | Modify | POST /api/inventory — nie mergen, immer neues Item |
| `server.ts:807-833` | Modify | POST /api/scan — AI Prompt Kategorie-Hinweise verbessern |
| `src/pages/Scanner.tsx` | Modify | "Nochmal scannen" Button nach Speichern |
| `src/pages/Inventory.tsx` | Modify | Gruppierung nach generic_name, jede Packung einzeln |
| `src/types.ts` | Modify | `package_size` und `opened_at` zum Interface hinzufügen |

---

### Task 1: Bessere Kategoriezuordnung (mapCategory)

**Files:**
- Modify: `server.ts:404-420`

- [ ] **Step 1: mapCategory() erweitern**

Aktuelle Regex-Liste deckt viele Produkte nicht ab. Erweitern um:

```typescript
const mapCategory = (rawCategory: string, productName: string): string => {
  const text = `${rawCategory} ${productName}`.toLowerCase();

  // Tiefkühl zuerst prüfen (hat Vorrang vor anderen Kategorien)
  if (text.match(/frozen|tiefkühl|tiefgefroren|tk[ -]|ice cream|eis am stiel|pizza.*frozen|iglo|frosta|bofrost/)) return 'Tiefkühl';
  // Kühlregal
  if (text.match(/dairy|milk|cheese|yogurt|milch|käse|joghurt|butter|cream|sahne|quark|schmand|skyr|frischkäse|aufschnitt|aufstrich|margarine|ei\b|eier/)) return 'Kühlregal';
  // Fleisch & Fisch
  if (text.match(/meat|fish|poultry|beef|pork|chicken|fleisch|fisch|hähnchen|wurst|schinken|salami|lachs|thunfisch|garnele|hack/)) return 'Fleisch & Fisch';
  // Obst & Gemüse
  if (text.match(/fruit|vegetable|obst|gemüse|apple|banana|tomato|potato|salat|zwiebel|karotte|paprika|gurke|zitrone|orange|beere/)) return 'Obst & Gemüse';
  // Backwaren
  if (text.match(/bread|bakery|pastry|brot|brötchen|toast|kuchen|croissant|semmel|laugen|mehl.*back/)) return 'Backwaren';
  // Getränke
  if (text.match(/beverage|drink|water|juice|getränk|wasser|saft|cola|beer|wine|bier|wein|limo|sprudel|tee\b|kaffee/)) return 'Getränke';
  // Snacks & Süßigkeiten
  if (text.match(/snack|sweet|candy|chocolate|chips|süßigkeit|schokolade|keks|cookie|gummi|bonbon|riegel|müsli.*riegel|nuss.*mix/)) return 'Snacks & Süßigkeiten';
  // Gewürze & Saucen
  if (text.match(/spice|sauce|condiment|salt|pepper|gewürz|salz|pfeffer|ketchup|mayo|senf|essig|öl\b|dressing|marinade|brühe|fond/)) return 'Gewürze & Saucen';
  // Haushalt & Drogerie
  if (text.match(/cleaning|hygiene|paper|household|haushalt|drogerie|seife|shampoo|waschmittel|spülmittel|toiletten|küchentuch|alufolie|frischhalte/)) return 'Haushalt & Drogerie';
  // Vorratsschrank (breit — Konserven, Pasta, Reis, etc.)
  if (text.match(/pasta|rice|cereal|flour|sugar|noodle|reis|mehl|zucker|konserve|dose|nudel|linse|bohne|erbse|tomatenmark|passiert|müsli|haferflocke|cornflakes|marmelade|honig|nutella/)) return 'Vorratsschrank';

  return 'Sonstiges';
};
```

- [ ] **Step 2: Deployen und testen**

Build + Deploy auf Pi. Neuen Barcode scannen, Kategorie prüfen.

- [ ] **Step 3: Commit**

```bash
git add server.ts
git commit -m "feat: improve category mapping with more keywords"
```

---

### Task 2: Inventory API — nie mergen, immer neues Item

**Files:**
- Modify: `server.ts:655-681`

- [ ] **Step 1: POST /api/inventory ändern**

Statt nach existing Item zu suchen und zu mergen, IMMER ein neues Item anlegen. `package_size` wird auf den Originalwert gesetzt.

```typescript
app.post('/api/inventory', (req, res) => {
  const { name, generic_name, quantity, unit, expiry_date, category, barcode, pieces_per_pack } = req.body;
  try {
    // Save to product_lookup for future barcode scans
    if (barcode) {
      db.prepare('INSERT OR IGNORE INTO product_lookup (barcode, name, generic_name, category, default_quantity, unit, pieces_per_pack) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(barcode, name, generic_name || name, category, quantity, unit, pieces_per_pack || 1);
    }

    // Always create a new item (each physical package is its own row)
    const stmt = db.prepare('INSERT INTO items (name, generic_name, quantity, unit, expiry_date, category, barcode, pieces_per_pack, package_size, is_open) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)');
    const info = stmt.run(name, generic_name || name, quantity, unit, expiry_date, category, barcode, pieces_per_pack || 1, quantity);
    res.json({ id: info.lastInsertRowid, name, generic_name: generic_name || name, quantity, unit, expiry_date, category, barcode, package_size: quantity });
  } catch (error) {
    console.error('Inventory add error:', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add server.ts
git commit -m "feat: always create new item per physical package"
```

---

### Task 3: Types — package_size und opened_at

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: InventoryItem Interface erweitern**

```typescript
export interface InventoryItem {
  id: number;
  name: string;
  generic_name?: string;
  quantity: number;
  unit: string;
  expiry_date: string | null;
  category: string;
  is_open: boolean;
  opened_at?: string | null;
  barcode?: string;
  pieces_per_pack?: number;
  package_size?: number;
  created_at: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add package_size and opened_at to InventoryItem type"
```

---

### Task 4: Scanner — "Nochmal scannen" nach Speichern

**Files:**
- Modify: `src/pages/Scanner.tsx`

- [ ] **Step 1: handleSave erweitern — nach Speichern Optionen zeigen**

Nach erfolgreichem Speichern statt direkt zu `/inventory` zu navigieren, einen Zustand `saved` setzen und Buttons zeigen:
- "Nochmal scannen (gleich)" → gleiche Daten, neues Item anlegen
- "Neuen Artikel scannen" → Scanner reset
- "Zum Vorrat" → navigate('/inventory')

```typescript
const [saved, setSaved] = useState(false);

const handleSave = async (replaceOld: boolean = false) => {
  if (!result) return;
  try {
    const payload = { ...result };
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Save failed');
    toast.success('Artikel gespeichert');
    setSaved(true);
  } catch (error) {
    toast.error('Fehler beim Speichern');
  }
};

const handleSaveAnother = async () => {
  // Save same product again as new item
  try {
    const payload = { ...result };
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Save failed');
    toast.success('Weitere Packung gespeichert');
  } catch (error) {
    toast.error('Fehler beim Speichern');
  }
};
```

- [ ] **Step 2: UI für "Gespeichert"-Zustand**

Nach dem Speichern die Buttons ersetzen durch:

```tsx
{saved ? (
  <div className="flex flex-col gap-3 pt-6 w-full">
    <button onClick={handleSaveAnother} className="...emerald...">
      <Plus size={20} /> Gleiche Packung nochmal
    </button>
    <button onClick={retake} className="...gray...">
      <Camera size={20} /> Neuen Artikel scannen
    </button>
    <button onClick={() => navigate('/inventory')} className="...outline...">
      Zum Vorrat →
    </button>
  </div>
) : (
  // existing save buttons
)}
```

- [ ] **Step 3: retake() muss auch `saved` resetten**

- [ ] **Step 4: Commit**

```bash
git add src/pages/Scanner.tsx
git commit -m "feat: add 'scan another' flow after saving"
```

---

### Task 5: Inventory — Gruppierung nach Produkt, jede Packung einzeln

**Files:**
- Modify: `src/pages/Inventory.tsx`

- [ ] **Step 1: Gruppierung anpassen**

Aktuell: gruppiert nach `category`.
Neu: Innerhalb jeder Kategorie nach `generic_name` gruppieren. Gleiche Produkte werden zusammen angezeigt mit individuellen Packungs-Cards.

Jede Packung zeigt:
- Status-Badge: "Offen" (blau) / "Zu" (grau)
- Füllstand: `quantity` / `package_size` (z.B. "150g / 250g")
- MHD mit Farb-Indikator
- Quick-Actions: Öffnen, Menge anpassen, Löschen

- [ ] **Step 2: Item-Card kompakter**

Für jede Packung eine kompakte Zeile statt einer großen Card:

```
[🟢 Zu]  Butter  250g / 250g  MHD 01.06  [📦→📭] [🗑]
[🔵 Offen] Butter  150g / 250g  MHD 15.04  [✏️] [🗑]
```

- [ ] **Step 3: Produkt-Header mit Gesamtübersicht**

Über den einzelnen Packungen ein Header pro Produkt:
```
Butter (3 Packungen, 650g gesamt)
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Inventory.tsx
git commit -m "feat: group inventory by product, show individual packages"
```

---

### Task 6: Build, Deploy, Verify

- [ ] **Step 1: Lokaler Build**

```bash
cd U:/AI-Tools/Claude/FoodAI
npm run build
```

- [ ] **Step 2: Deploy auf Pi**

Upload dist/ + server.ts → Container restart.

- [ ] **Step 3: E2E Test**

1. Barcode scannen → Kategorie prüfen (verbessert?)
2. Speichern → "Nochmal scannen" Buttons da?
3. Gleiche Packung nochmal speichern → 2 Items im Inventar?
4. Inventar → Gruppierung korrekt?
5. Packung öffnen → Badge ändert sich?

- [ ] **Step 4: Final Commit**

```bash
git add -A
git commit -m "feat: inventory refactoring complete — per-package tracking"
```
