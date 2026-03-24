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

export interface PlannedRecipe {
  id: number;
  date: string;
  title: string;
  description: string;
  ingredients: {
    name: string;
    amount: number;
    unit: string;
    in_inventory: boolean;
  }[];
  instructions: string[];
  portions: number;
  base_portions: number;
  cooked: boolean;
}

export interface Recipe {

  title: string;
  description: string;
  ingredients: {
    name: string;
    amount: number;
    unit: string;
    in_inventory: boolean;
  }[];
  instructions: string[];
}
