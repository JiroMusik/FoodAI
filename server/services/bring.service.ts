// @ts-ignore
import Bring from 'bring-shopping';
import { db } from '../db/database';
import { convertToSmallestUnit, normalizeUnit } from '../utils/units';

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

    const inventory = db.prepare('SELECT name, quantity, unit, min_stock FROM items WHERE quantity > 0').all() as any[];
    const allKnownItems = db.prepare('SELECT name, quantity, unit, min_stock FROM items').all() as any[];
    
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

    const missingNames = new Set<string>();
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
        missingNames.add(reqIng.name.toLowerCase());
      }
    });

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
