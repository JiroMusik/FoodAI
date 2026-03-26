export const normalizeUnit = (unit: string): string => {
  const u = unit.toLowerCase().trim();
  if (u === 'g' || u === 'gramm') return 'g';
  if (u === 'kg' || u === 'kilogramm') return 'kg';
  if (u === 'ml' || u === 'milliliter') return 'ml';
  if (u === 'l' || u === 'liter') return 'l';
  if (u === 'stk' || u === 'stück' || u === 'piece' || u === 'pcs') return 'Stück';
  if (u === 'pkg' || u === 'packung' || u === 'pack') return 'Packung';
  return unit;
};

export const convertToSmallestUnit = (amount: number, unit: string): { amount: number, unit: string } => {
  const norm = normalizeUnit(unit);
  if (norm === 'kg') return { amount: amount * 1000, unit: 'g' };
  if (norm === 'l') return { amount: amount * 1000, unit: 'ml' };
  return { amount, unit: norm };
};

export const amountsMatch = (reqAmt: number, reqUnit: string, invAmt: number, invUnit: string): boolean => {
  const req = convertToSmallestUnit(reqAmt, reqUnit);
  const inv = convertToSmallestUnit(invAmt, invUnit);
  if (req.unit !== inv.unit) return false;
  return inv.amount >= req.amount;
};
