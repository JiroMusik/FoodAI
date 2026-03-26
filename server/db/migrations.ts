import { Database } from 'better-sqlite3';
import { mapCategory } from '../utils/categories';

export const runMigrations = (db: Database) => {
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
  addColumn('planned_recipes', 'image_url', 'TEXT');
  addColumn('favorite_recipes', 'image_url', 'TEXT');

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

    // One-time migrations (tracked via settings to not re-run on every start)
    const migrationDone = (key: string) => !!(db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any);
    const markMigration = (key: string) => db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, '1')").run(key);

    // Split "Gewürze & Saucen" into separate categories (one-time)
    if (!migrationDone('migration_split_gewuerze_v1')) {
      const saucePattern = /sauce|ketchup|mayo|remoulade|senf|dressing|marinade|brühe|bouillon|fond|soja|worcester|tabasco|sriracha|pesto|saucenbinder|crema|aceto|balsamico/i;
      const oldCatItems = db.prepare("SELECT id, name FROM items WHERE category = 'Gewürze & Saucen'").all() as any[];
      const updateCat = db.prepare('UPDATE items SET category = ? WHERE id = ?');
      for (const item of oldCatItems) {
        if (saucePattern.test(item.name)) {
          updateCat.run('Saucen', item.id);
        } else {
          updateCat.run('Gewürze', item.id);
        }
      }
      markMigration('migration_split_gewuerze_v1');
    }

    // Re-categorize items with old English category names (one-time)
    if (!migrationDone('migration_recat_v1')) {
      const items = db.prepare('SELECT id, name, category FROM items').all() as any[];
      const updateItemCat = db.prepare('UPDATE items SET category = ? WHERE id = ?');
      for (const item of items) {
        const newCat = mapCategory(item.category || '', item.name);
        if (newCat !== item.category) {
          updateItemCat.run(newCat, item.id);
        }
      }
      markMigration('migration_recat_v1');
    }
  })();
};
