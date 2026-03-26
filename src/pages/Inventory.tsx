import { useState, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, Calendar, Tag, Package, ChevronDown, ChevronRight, Check, X, AlertCircle, Loader2, PackageOpen } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { InventoryItem } from '../types.ts';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';

export default function Inventory() {
  const { t, i18n } = useTranslation();

  const getExpiryStatus = (date: string | null, category?: string) => {
    if (!date) return 'ok';
    // Gewürze werden praktisch nicht schlecht
    if (category === 'Gewürze') return 'ok';
    const expiry = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = expiry.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));

    if (days < 0) return 'expired';
    if (days <= 3) return 'warning';
    return 'ok';
  };

  const dateLocale = t('common.dateLocale');

  const formatDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const categoryMap: Record<string, string> = {
    'fruitsVegetables': t('categories.fruitsVegetables'),
    'refrigerated': t('categories.refrigerated'),
    'frozen': t('categories.frozen'),
    'pantry': t('categories.pantry'),
    'beverages': t('categories.beverages'),
    'bakery': t('categories.bakery'),
    'meatFish': t('categories.meatFish'),
    'snacksSweets': t('categories.snacksSweets'),
    'spices': t('categories.spices'),
    'sauces': t('categories.sauces'),
    'householdDrugstore': t('categories.householdDrugstore'),
    'other': t('categories.other'),
  };
  const categoryKeys = Object.keys(categoryMap);
  const categoryValues = Object.values(categoryMap);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState<string>('0');
  const [editUnit, setEditUnit] = useState<string>('');
  const [editExpiry, setEditExpiry] = useState<string>('');
  const [editPackageSize, setEditPackageSize] = useState<string>('0');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editPrice, setEditPrice] = useState<string>('0');
  const [editLocation, setEditLocation] = useState<string>('Vorratsschrank');
  const [editMinStock, setEditMinStock] = useState<string>('0');
  const [editName, setEditName] = useState<string>('');
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);

  useEffect(() => { fetchInventory(); }, []);

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/inventory');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
        // Categories start collapsed
        setExpandedCategories([]);
      }
    } catch (error) {
      toast.error(t('inventory.errorLoadingInventory'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (id: number) => {
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount < 0) { toast.error(t('inventory.enterValidAmount')); return; }
    const item = items.find(i => i.id === id);
    if (!item) return;
    try {
      const pkgSize = parseFloat(editPackageSize) || amount;
      const finalPkgSize = Math.max(pkgSize, amount);
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...item,
          name: editName || item.name,
          quantity: amount,
          unit: editUnit,
          expiry_date: editExpiry || null,
          package_size: finalPkgSize,
          category: editCategory,
          price: parseFloat(editPrice) || 0,
          location: editLocation,
          min_stock: parseFloat(editMinStock) || 0
        })
      });
      if (res.ok) {
        setItems(items.map(i => i.id === id ? {
          ...i,
          name: editName || item.name,
          quantity: amount,
          unit: editUnit,
          expiry_date: editExpiry || null,
          package_size: finalPkgSize,
          category: editCategory,
          price: parseFloat(editPrice) || 0,
          location: editLocation,
          min_stock: parseFloat(editMinStock) || 0
        } : i));
        toast.success(t('common.updated'));
        setEditingId(null);
      }
    } catch (e) { toast.error(t('common.errorSaving')); }
  };

  const handleQuickAdd = (delta: number) => {
    setEditAmount(prev => Math.max(0, parseFloat(prev || '0') + delta).toString());
  };

  const handleSetQuantity = async (id: number, newQuantity: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, quantity: newQuantity, unit: editUnit, category: editCategory })
      });
      if (res.ok) {
        setItems(items.map(i => i.id === id ? { ...i, quantity: newQuantity, unit: editUnit, category: editCategory } : i));
        toast.success(t('common.updated'));
      }
    } catch (error) { toast.error(t('common.error')); }
    setEditingId(null);
  };

  const deleteItem = async (id: number) => {
    if (!window.confirm(t('inventory.confirmDeletePackage'))) return;
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems(items.filter(i => i.id !== id));
        toast.success(t('common.deleted'));
      }
    } catch (error) { toast.error(t('common.errorDeleting')); }
  };

  const handleOpenItem = async (id: number) => {
    setOpeningId(id);
    try {
      const res = await fetch(`/api/inventory/${id}/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const updatedItem = await res.json();
        setItems(items.map(i => i.id === id ? updatedItem : i));
        toast.success(t('inventory.markedAsOpened'));
      }
    } catch (error) { toast.error(t('common.error')); }
    finally { setOpeningId(null); }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length || !window.confirm(`${selectedIds.length} Artikel wirklich löschen?`)) return;
    try {
      const res = await fetch('/api/inventory/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        setItems(items.filter(i => !selectedIds.includes(i.id)));
        setSelectedIds([]);
        setIsBulkMode(false);
        toast.success(t('common.deleted'));
      }
    } catch (e) { toast.error(t('common.errorDeleting')); }
  };

  const handleBulkUpdate = async (updates: any) => {
    if (!selectedIds.length) return;
    try {
      const res = await fetch('/api/inventory/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, updates })
      });
      if (res.ok) {
        setItems(items.map(i => selectedIds.includes(i.id) ? { ...i, ...updates } : i));
        setSelectedIds([]);
        setIsBulkMode(false);
        toast.success(t('common.updated'));
      }
    } catch (e) { toast.error(t('common.errorUpdating')); }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  // Group by category, then by generic_name within each category
  const groupedByCategory = filteredItems.reduce((acc, item) => {
    const cat = item.category || t('categories.other');
    if (!acc[cat]) acc[cat] = {};
    const groupKey = item.generic_name || item.name;
    if (!acc[cat][groupKey]) acc[cat][groupKey] = [];
    acc[cat][groupKey].push(item);
    return acc;
  }, {} as Record<string, Record<string, InventoryItem[]>>);

  const sortedCategories = Object.keys(groupedByCategory).sort((a, b) => {
    const aItems = Object.values(groupedByCategory[a]).flat();
    const bItems = Object.values(groupedByCategory[b]).flat();
    const aHasWarning = aItems.some(i => getExpiryStatus(i.expiry_date, i.category) !== 'ok');
    const bHasWarning = bItems.some(i => getExpiryStatus(i.expiry_date, i.category) !== 'ok');
    if (aHasWarning && !bHasWarning) return -1;
    if (!aHasWarning && bHasWarning) return 1;
    return a.localeCompare(b);
  });

  const totalItems = items.length;

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4 bg-gray-50">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-gray-500 font-medium">{t('inventory.loadingInventory')}</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-3xl mx-auto pb-32">
      <header className="mb-6 sm:mb-10 pt-2 sm:pt-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold tracking-widest text-gray-900">{t('inventory.title')}</h1>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setIsBulkMode(!isBulkMode);
                setSelectedIds([]);
              }}
              className={`p-2 rounded-xl transition-all ${isBulkMode ? 'bg-emerald-600 text-white shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              title="Selection Mode"
            >
              <Check size={20} />
            </button>
            <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center">
              {t('inventory.packagesCount', { count: totalItems })}
            </div>
          </div>
        </div>
      </header>

      <div className="relative mb-6 sm:mb-10 group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
        <input
          type="text"
          placeholder={t('inventory.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-2xl py-3 sm:py-4 pl-12 pr-4 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-700"
        />
      </div>

      <div className="space-y-4 sm:space-y-6">
        {sortedCategories.map((category) => {
          const productGroups = groupedByCategory[category];
          const categoryItemCount = Object.values(productGroups).flat().length;

          const categoryIcons: Record<string, string> = {
            'Obst & Gemüse': '🥬', 'Kühlregal': '🧊', 'Tiefkühl': '❄️',
            'Vorratsschrank': '🏪', 'Getränke': '🥤', 'Backwaren': '🍞',
            'Fleisch & Fisch': '🥩', 'Snacks & Süßigkeiten': '🍫',
            'Gewürze': '🧂', 'Saucen': '🫙', 'Haushalt & Drogerie': '🧹', 'Sonstiges': '📦'
          };
          const icon = categoryIcons[category] || '📦';

          return (
            <div key={category} className="space-y-2">
              <button
                onClick={() => toggleCategory(category)}
                className="flex items-center justify-between w-full px-2 py-2 group hover:bg-gray-50 rounded-xl transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                    {icon}
                  </div>
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">{category}</h2>
                  <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-full font-bold">{categoryItemCount}</span>
                </div>
                {expandedCategories.includes(category) ? <ChevronDown size={20} className="text-gray-300" /> : <ChevronRight size={20} className="text-gray-300" />}
              </button>

              <AnimatePresence initial={false}>
                {expandedCategories.includes(category) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="space-y-3 overflow-hidden"
                  >
                    {Object.entries(productGroups).map(([groupName, packages]) => (
                      <div key={groupName} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        {/* Product header */}
                        {packages.length > 1 && (
                          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-700">{groupName}</span>
                            <span className="text-[10px] font-bold text-gray-400">{t('inventory.packagesCount', { count: packages.length })}</span>
                          </div>
                        )}

                        {/* Individual packages */}
                        {packages.map((item) => (
                          <div 
                            key={item.id} 
                            onClick={() => isBulkMode && toggleSelection(item.id)}
                            className={`p-3 sm:p-4 border-b border-gray-50 last:border-b-0 transition-all ${
                              isBulkMode && selectedIds.includes(item.id) ? 'bg-emerald-50/50' : ''
                            }`}
                          >
                            {/* Selection indicator for bulk mode */}
                            {isBulkMode && (
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                  selectedIds.includes(item.id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 bg-white'
                                }`}>
                                  {selectedIds.includes(item.id) && <Check size={14} strokeWidth={4} />}
                                </div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                  {selectedIds.includes(item.id) ? 'Ausgewählt' : 'Auswählen'}
                                </span>
                              </div>
                            )}

                            {editingId === item.id ? (
                              /* Edit mode */
                              <div className="bg-gray-50 rounded-xl p-3 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('inventory.edit')}</span>
                                  <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 p-1 bg-white rounded-full shadow-sm"><X size={14} /></button>
                                </div>

                                {/* Package context with editable package_size */}
                                {editUnit !== '%' && (
                                  <div className="bg-white rounded-lg p-2 border border-gray-100">
                                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                      <div className="flex items-center gap-1">
                                        <span>{t('inventory.packageLabel')}</span>
                                        <input type="number" value={editPackageSize} onChange={e => setEditPackageSize(e.target.value)}
                                          className="w-16 bg-gray-50 border border-gray-200 rounded px-1 py-0.5 text-xs font-bold text-gray-700 text-center" />
                                        <span>{editUnit}</span>
                                      </div>
                                      <span className="font-bold">{parseFloat(editPackageSize) > 0 ? Math.round((parseFloat(editAmount) / parseFloat(editPackageSize)) * 100) : 0}%</span>
                                    </div>
                                    {parseFloat(editPackageSize) > 0 && (
                                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className={`h-full transition-all rounded-full ${parseFloat(editAmount) / parseFloat(editPackageSize) > 0.5 ? 'bg-emerald-500' : parseFloat(editAmount) / parseFloat(editPackageSize) > 0.25 ? 'bg-orange-500' : 'bg-red-500'}`}
                                          style={{ width: `${Math.min(100, Math.max(0, (parseFloat(editAmount) / parseFloat(editPackageSize)) * 100))}%` }} />
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Name field — always visible */}
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Name</label>
                                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>

                                {/* Quantity + Unit */}
                                {editUnit === '%' ? (
                                  <div className="space-y-3">
                                    <div className="flex flex-wrap gap-2">
                                      {[100, 75, 50, 25, 0].map(pct => (
                                        <button key={pct} onClick={() => setEditAmount(pct.toString())}
                                          className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${parseFloat(editAmount) === pct ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
                                          {pct === 0 ? t('common.empty') : `${pct}%`}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <select value={editUnit} onChange={(e) => setEditUnit(e.target.value)}
                                        className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-600">
                                        {[t('units.piece'), 'g', 'kg', 'ml', 'l', '%'].map(u => <option key={u} value={u}>{u}</option>)}
                                      </select>
                                      <span className="text-xs text-gray-400">{t('inventory.changeUnit')}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                                        className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xl font-black text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none" autoFocus />
                                      <select value={editUnit} onChange={(e) => setEditUnit(e.target.value)}
                                        className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-600">
                                        {[t('units.piece'), 'g', 'kg', 'ml', 'l', '%'].map(u => <option key={u} value={u}>{u}</option>)}
                                      </select>
                                    </div>

                                    {/* Quick buttons based on unit */}
                                  </>
                                )}

                                {/* Shared fields — always visible */}
                                    <div className="grid grid-cols-2 gap-3">
                                <div className="group">
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Lagerort</label>
                                  <select
                                    value={editLocation}
                                    onChange={(e) => setEditLocation(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                  >
                                    <option value="Vorratsschrank">Vorratsschrank</option>
                                    <option value="Kühlschrank">Kühlschrank</option>
                                    <option value="Gefrierschrank">Gefrierschrank</option>
                                    <option value="Speisekammer">Speisekammer</option>
                                    <option value="Keller">Keller</option>
                                  </select>
                                </div>
                                <div className="group">
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Preis (€)</label>
                                  <input 
                                    type="number" 
                                    step="0.01"
                                    value={editPrice}
                                    onChange={e => setEditPrice(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                  />
                                </div>
                              </div>

                              <div className="group">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Mindestbestand (Einkaufswarnung)</label>
                                <input 
                                  type="number" 
                                  value={editMinStock}
                                  onChange={e => setEditMinStock(e.target.value)}
                                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                  placeholder="0 = Deaktiviert"
                                />
                              </div>

                              {(editUnit === 'g' || editUnit === 'ml') && (
                                      <div className="flex flex-wrap gap-2">
                                        <button onClick={() => handleQuickAdd(-100)} className="flex-1 py-1.5 bg-white border rounded-lg text-xs font-bold text-gray-600">-100</button>
                                        <button onClick={() => handleQuickAdd(-50)} className="flex-1 py-1.5 bg-white border rounded-lg text-xs font-bold text-gray-600">-50</button>
                                        <button onClick={() => handleQuickAdd(50)} className="flex-1 py-1.5 bg-white border rounded-lg text-xs font-bold text-emerald-600">+50</button>
                                        <button onClick={() => handleQuickAdd(100)} className="flex-1 py-1.5 bg-white border rounded-lg text-xs font-bold text-emerald-600">+100</button>
                                      </div>
                                    )}
                                    {editUnit === t('units.piece') && (
                                      <div className="flex flex-wrap gap-2">
                                        <button onClick={() => handleQuickAdd(-1)} className="flex-1 py-1.5 bg-white border rounded-lg text-xs font-bold text-gray-600">-1</button>
                                        <button onClick={() => handleQuickAdd(-5)} className="flex-1 py-1.5 bg-white border rounded-lg text-xs font-bold text-gray-600">-5</button>
                                        <button onClick={() => handleQuickAdd(1)} className="flex-1 py-1.5 bg-white border rounded-lg text-xs font-bold text-emerald-600">+1</button>
                                        <button onClick={() => handleQuickAdd(5)} className="flex-1 py-1.5 bg-white border rounded-lg text-xs font-bold text-emerald-600">+5</button>
                                      </div>
                                    )}

                                    <div className="flex gap-2">
                                      <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t('inventory.expiryLabel')}</label>
                                        <input type="date" value={editExpiry} onChange={e => setEditExpiry(e.target.value)}
                                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                      </div>
                                      <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t('inventory.categoryLabel')}</label>
                                        <select value={editCategory} onChange={e => setEditCategory(e.target.value)}
                                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none">
                                          {categoryValues.map(c =>
                                            <option key={c} value={c}>{c}</option>
                                          )}
                                        </select>
                                      </div>
                                    </div>

                                    <div className="flex gap-2">
                                      <button onClick={() => handleSaveEdit(item.id)} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2"><Check size={16} /> {t('common.save')}</button>
                                      <button onClick={() => deleteItem(item.id)} className="px-4 bg-red-50 text-red-600 rounded-xl flex items-center justify-center"><Trash2 size={18} /></button>
                                    </div>
                              </div>
                            ) : (
                              /* Display mode */
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {packages.length <= 1 && <h3 className="font-bold text-gray-900 text-base leading-tight">{item.name}</h3>}
                                    {item.is_open ? (
                                      <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0">{t('common.open')}</span>
                                    ) : (
                                      <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0">{t('common.closed')}</span>
                                    )}
                                    {getExpiryStatus(item.expiry_date, item.category) === 'expired' && (
                                      <span className="bg-red-50 text-red-600 text-[10px] px-2 py-0.5 rounded-md font-black shrink-0">{t('common.expired')}</span>
                                    )}
                                    {getExpiryStatus(item.expiry_date, item.category) === 'warning' && (
                                      <span className="bg-orange-50 text-orange-600 text-[10px] px-2 py-0.5 rounded-md font-black shrink-0">{t('common.expiringSoon')}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                    <span className="font-bold text-gray-700">
                                      {item.quantity}{item.unit}
                                      {item.package_size && item.package_size !== item.quantity && (
                                        <span className="text-gray-400 font-normal"> / {item.package_size}{item.unit}</span>
                                      )}
                                    </span>
                                    {item.expiry_date && (
                                      <span className={`flex items-center gap-1 text-xs ${getExpiryStatus(item.expiry_date, item.category) !== 'ok' ? 'text-red-500 font-bold' : ''}`}>
                                        <Calendar size={12} /> {formatDate(item.expiry_date)}
                                      </span>
                                    )}
                                    {item.unit === '%' && (
                                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className={`h-full ${item.quantity > 50 ? 'bg-emerald-500' : item.quantity > 25 ? 'bg-orange-500' : 'bg-red-500'}`}
                                          style={{ width: `${Math.min(100, Math.max(0, item.quantity))}%` }} />
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  {!item.is_open && item.quantity > 0 && (
                                    <button onClick={() => handleOpenItem(item.id)} disabled={openingId === item.id}
                                      className="flex flex-col items-center gap-0.5 p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                                      {openingId === item.id ? <Loader2 size={20} className="animate-spin" /> : <PackageOpen size={20} />}
                                      <span className="text-[9px] font-bold">{t('inventory.openTooltip')}</span>
                                    </button>
                                  )}
                                  <button onClick={() => {
                                    setEditingId(item.id);
                                    setEditName(item.name);
                                    setEditAmount(item.quantity.toString());
                                    setEditUnit(item.unit);
                                    setEditExpiry(item.expiry_date || '');
                                    setEditPackageSize(item.package_size?.toString() || item.quantity.toString());
                                    setEditCategory(item.category);
                                    setEditPrice(item.price?.toString() || '0');
                                    setEditLocation(item.location || 'Vorratsschrank');
                                    setEditMinStock(item.min_stock?.toString() || '0');
                                  }} className="flex flex-col items-center gap-0.5 p-1.5 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all">
                                    <Package size={20} />
                                    <span className="text-[9px] font-bold">{t('inventory.editTooltip')}</span>
                                  </button>
                                  <button onClick={() => deleteItem(item.id)}
                                    className="flex flex-col items-center gap-0.5 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                                    <Trash2 size={20} />
                                    <span className="text-[9px] font-bold">{t('inventory.deleteTooltip')}</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="text-center py-24 bg-white rounded-[40px] border-2 border-dashed border-gray-100">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="text-gray-200" size={40} />
            </div>
            <p className="text-gray-500 font-bold text-lg mb-1">{t('inventory.emptyTitle')}</p>
            <p className="text-gray-400 text-sm">{t('inventory.emptySubtitle')}</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isBulkMode && selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 left-4 right-4 bg-white/95 backdrop-blur-md border border-emerald-100 shadow-2xl rounded-3xl p-4 flex flex-col gap-3 z-50 max-w-2xl mx-auto ring-1 ring-black/5"
          >
            <div className="flex justify-between items-center px-2">
              <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">{selectedIds.length} ausgewählt</span>
              <button onClick={() => setSelectedIds([])} className="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-tight">{t('common.cancel')}</button>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <select 
                className="bg-gray-50 border border-gray-100 rounded-xl px-2 py-2 text-[10px] font-bold text-gray-600 outline-none appearance-none text-center"
                onChange={(e) => handleBulkUpdate({ category: e.target.value })}
                value=""
              >
                <option value="" disabled>Kategorie</option>
                {categoryValues.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select 
                className="bg-gray-50 border border-gray-100 rounded-xl px-2 py-2 text-[10px] font-bold text-gray-600 outline-none appearance-none text-center"
                onChange={(e) => handleBulkUpdate({ location: e.target.value })}
                value=""
              >
                <option value="" disabled>Lagerort</option>
                <option value="Vorratsschrank">Vorrat</option>
                <option value="Kühlschrank">Kühlschrank</option>
                <option value="Gefrierschrank">TK</option>
                <option value="Speisekammer">Kammer</option>
                <option value="Keller">Keller</option>
              </select>

              <button 
                onClick={handleBulkDelete}
                className="bg-red-50 text-red-600 py-2 rounded-xl text-[10px] font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={14} /> {t('common.delete')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
