// @ts-ignore
import Bring from 'bring-shopping';
import { db } from '../db/database';
import { convertToSmallestUnit, normalizeUnit } from '../utils/units';

// Import isIngredientInInventory from server.ts is circular — inline a simple version
const normalizeIngredient = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, '').replace(/[,\.]/g, '').replace(/\s+/g, ' ').trim();

const getBringClient = () => {
  const emailRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('bring_email') as any;
  const passRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('bring_password') as any;
  if (!emailRow || !passRow) return null;
  return new Bring({ mail: emailRow.value, password: passRow.value });
};

export const syncToBring = async () => {
  const bring = getBringClient();
  if (!bring) return;

  try {
    await bring.login();
    const lists = await bring.loadLists();
    if (!lists || lists.lists.length === 0) return;

    const listId = lists.lists[0].listUuid;
    const bringItems = await bring.getItems(listId);

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

    const inventory = db.prepare('SELECT name, generic_name, quantity, unit, min_stock, category FROM items WHERE quantity > 0').all() as any[];
    const allKnownItems = db.prepare('SELECT name, generic_name, quantity, unit, min_stock, category FROM items').all() as any[];

    // Min-stock requirements
    const stockLevels: Record<string, { total: number, min: number, unit: string, category: string, name: string }> = {};
    allKnownItems.forEach(item => {
      const key = `${item.name.toLowerCase()}_${normalizeUnit(item.unit)}`;
      if (!stockLevels[key]) {
        stockLevels[key] = { total: 0, min: item.min_stock || 0, unit: normalizeUnit(item.unit), category: item.category, name: item.name };
      }
      const smallest = convertToSmallestUnit(item.quantity, item.unit);
      stockLevels[key].total += smallest.amount;
    });

    Object.entries(stockLevels).forEach(([key, level]) => {
      if (level.min > 0 && level.total < level.min) {
        if (level.category === 'Gewürze') {
          // Spices: "1 Packung"
          const spiceKey = `${level.name.toLowerCase()}_Stück`;
          if (!required[spiceKey]) {
            required[spiceKey] = { amount: 1, unit: 'Stück', name: level.name };
          }
        } else {
          const missing = level.min - level.total;
          if (!required[key]) {
            required[key] = { amount: 0, unit: level.unit, name: level.name };
          }
          required[key].amount += missing;
        }
      }
    });

    const missingNames = new Set<string>();
    Object.values(required).forEach((reqIng: any) => {
      // Spices: if in inventory with quantity > 0, always consider available
      const matchedInv = inventory.find(inv => {
        const invNorm = normalizeIngredient(inv.name);
        const genNorm = inv.generic_name ? normalizeIngredient(inv.generic_name) : '';
        const reqNorm = normalizeIngredient(reqIng.name);
        return invNorm.includes(reqNorm) || reqNorm.includes(invNorm) ||
               genNorm.includes(reqNorm) || reqNorm.includes(genNorm);
      });

      if (matchedInv?.category === 'Gewürze' && matchedInv.quantity > 0) {
        return; // Spice in stock, skip
      }

      // Standard unit-aware matching
      const matchingItems = inventory.filter(inv => {
        const invNorm = normalizeIngredient(inv.name);
        const genNorm = inv.generic_name ? normalizeIngredient(inv.generic_name) : '';
        const reqNorm = normalizeIngredient(reqIng.name);
        const nameMatch = invNorm.includes(reqNorm) || reqNorm.includes(invNorm) ||
                         genNorm.includes(reqNorm) || reqNorm.includes(genNorm);
        if (!nameMatch) return false;
        const invSmallest = convertToSmallestUnit(inv.quantity, inv.unit);
        return invSmallest.unit === reqIng.unit;
      });

      const totalInInventory = matchingItems.reduce((sum, inv) => {
        const invSmallest = convertToSmallestUnit(inv.quantity, inv.unit);
        return sum + invSmallest.amount;
      }, 0);

      if (totalInInventory < reqIng.amount) {
        missingNames.add(reqIng.name.toLowerCase());
      }
    });

    // ONE-WAY SYNC: add missing, remove no-longer-missing known items
    const bringCurrentNames = new Set(bringItems.purchase.map((i: any) => i.name.toLowerCase()));
    for (const missingName of missingNames) {
      if (!bringCurrentNames.has(missingName)) {
        await bring.saveItem(listId, missingName, '');
      }
    }

    const allInternalIngredients = new Set(allKnownItems.map(i => i.name.toLowerCase()));
    for (const bringItem of bringItems.purchase) {
      const bringName = bringItem.name.toLowerCase();
      if (allInternalIngredients.has(bringName) && !missingNames.has(bringName)) {
        await bring.removeItem(listId, bringItem.name);
      }
    }
  } catch (error) {
    console.error('Bring sync error:', error);
  }
};
