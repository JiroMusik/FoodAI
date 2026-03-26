import { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, Plus, Check, Trash2, X, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Navigation from '../components/Navigation';
import { useInventory } from '../hooks/useInventory';
import { CategorySection } from '../components/inventory/CategorySection';
import { PackageItem } from '../components/inventory/PackageItem';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function Inventory() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const {
    items,
    loading,
    fetchInventory,
    updateItem,
    deleteItem,
    openPackage,
    bulkDelete,
    bulkUpdate,
    setItems
  } = useInventory();

  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Edit form states
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('0');
  const [editUnit, setEditUnit] = useState('');
  const [editExpiry, setEditExpiry] = useState('');
  const [editPackageSize, setEditPackageSize] = useState('0');
  const [editCategory, setEditCategory] = useState('');
  const [editLocation, setEditLocation] = useState('Vorratsschrank');
  const [editPrice, setEditPrice] = useState('0');
  const [editMinStock, setEditMinStock] = useState('0');
  const [openingId, setOpeningId] = useState<number | null>(null);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()) ||
      item.generic_name?.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, typeof items> = {};
    filteredItems.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  const sortedCategories = useMemo(() => {
    return Object.keys(groupedByCategory).sort((a, b) => a.localeCompare(b));
  }, [groupedByCategory]);

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditAmount(item.quantity.toString());
    setEditUnit(item.unit);
    setEditExpiry(item.expiry_date || '');
    setEditPackageSize(item.package_size?.toString() || item.quantity.toString());
    setEditCategory(item.category);
    setEditLocation(item.location || 'Vorratsschrank');
    setEditPrice(item.price?.toString() || '0');
    setEditMinStock(item.min_stock?.toString() || '0');
  };

  const handleSaveEdit = async (id: number) => {
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error(t('inventory.enterValidAmount'));
      return;
    }
    
    const updates = {
      name: editName,
      quantity: amount,
      unit: editUnit,
      expiry_date: editExpiry || null,
      package_size: Math.max(parseFloat(editPackageSize) || amount, amount),
      category: editCategory,
      location: editLocation,
      price: parseFloat(editPrice) || 0,
      min_stock: parseFloat(editMinStock) || 0
    };

    try {
      await updateItem(id, updates);
      setEditingId(null);
    } catch (e) {}
  };

  const handleQuickAdd = (delta: number) => {
    setEditAmount(prev => Math.max(0, parseFloat(prev || '0') + delta).toString());
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <Loader2 className="animate-spin text-emerald-500 mb-4" size={48} />
        <p className="text-gray-500 font-medium">{t('inventory.loadingInventory')}</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto pb-32">
      <header className="flex flex-col mb-8 pt-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-gray-900">{t('inventory.title')}</h1>
            <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100 font-bold text-xs">
              {items.length}
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setIsBulkMode(!isBulkMode);
                setSelectedIds([]);
              }}
              className={`p-3 rounded-2xl transition-all ${isBulkMode ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-white border border-gray-100 text-gray-400 hover:text-emerald-600 shadow-sm'}`}
            >
              <Check size={20} />
            </button>
            <button
              onClick={() => navigate('/scanner')}
              className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-emerald-500 transition-colors">
            <Search size={20} />
          </div>
          <input
            type="text"
            placeholder={t('inventory.searchPlaceholder')}
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-[24px] focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm transition-all text-lg font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <div className="space-y-4">
        {sortedCategories.map(category => (
          <CategorySection
            key={category}
            category={category}
            items={groupedByCategory[category]}
            isExpanded={expandedCategories.includes(category)}
            onToggle={() => setExpandedCategories(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category])}
            renderItem={(item) => (
              <PackageItem
                key={item.id}
                item={item}
                isEditing={editingId === item.id}
                isOpening={openingId === item.id}
                isSelected={selectedIds.includes(item.id)}
                isBulkMode={isBulkMode}
                onEdit={() => handleEdit(item)}
                onDelete={() => deleteItem(item.id)}
                onOpen={async () => {
                  setOpeningId(item.id);
                  try { await openPackage(item.id); } finally { setOpeningId(null); }
                }}
                onToggleSelect={() => setSelectedIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id])}
                onUpdateQuantity={() => {}} // Not used in this layout
                renderEditForm={() => (
                  <div className="p-4 bg-emerald-50/30 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="group">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{t('inventory.nameLabel')}</label>
                        <input 
                          type="text" 
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="group">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{t('inventory.amountLabel')}</label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              value={editAmount}
                              onChange={e => setEditAmount(e.target.value)}
                              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                        </div>
                        <div className="group">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{t('inventory.unitLabel')}</label>
                          <select 
                            value={editUnit}
                            onChange={e => setEditUnit(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                          >
                            {['Stück', 'g', 'kg', 'ml', 'l', '%'].map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="group">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{t('inventory.expiryLabel')}</label>
                          <input 
                            type="date" 
                            value={editExpiry}
                            onChange={e => setEditExpiry(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                        <div className="group">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{t('inventory.locationLabel')}</label>
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
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="group">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{t('inventory.priceLabel')} (€)</label>
                          <input 
                            type="number" 
                            step="0.01"
                            value={editPrice}
                            onChange={e => setEditPrice(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                        <div className="group">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{t('inventory.minStockLabel')}</label>
                          <input 
                            type="number" 
                            value={editMinStock}
                            onChange={e => setEditMinStock(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => setEditingId(null)}
                        className="flex-1 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all"
                      >
                        {t('common.cancel')}
                      </button>
                      <button 
                        onClick={() => handleSaveEdit(item.id)}
                        className="flex-[2] py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2"
                      >
                        <Save size={18} /> {t('common.save')}
                      </button>
                    </div>
                  </div>
                )}
              />
            )}
          />
        ))}

        {items.length === 0 && !loading && (
          <div className="text-center py-20 bg-white rounded-[32px] border border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
              <Plus size={40} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{t('inventory.emptyTitle')}</h3>
            <p className="text-gray-500 text-sm max-w-xs mx-auto">{t('inventory.emptySubtitle')}</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isBulkMode && selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 left-4 right-4 bg-white/95 backdrop-blur-md border border-emerald-100 shadow-2xl rounded-[32px] p-6 z-50 max-w-2xl mx-auto ring-1 ring-black/5 flex flex-col gap-4"
          >
            <div className="flex justify-between items-center px-2">
              <span className="text-sm font-black text-emerald-600 uppercase tracking-widest">{selectedIds.length} {t('inventory.selected')}</span>
              <button onClick={() => setSelectedIds([])} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1">{t('inventory.locationLabel')}</label>
                <select 
                  className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 outline-none appearance-none shadow-sm"
                  onChange={(e) => bulkUpdate(selectedIds, { location: e.target.value })}
                  value=""
                >
                  <option value="" disabled>{t('common.move')}</option>
                  <option value="Vorratsschrank">Vorratsschrank</option>
                  <option value="Kühlschrank">Kühlschrank</option>
                  <option value="Gefrierschrank">Gefrierschrank</option>
                  <option value="Speisekammer">Speisekammer</option>
                  <option value="Keller">Keller</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1">{t('common.delete')}</label>
                <button 
                  onClick={() => bulkDelete(selectedIds)}
                  className="bg-red-50 text-red-600 py-3 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2 border border-red-100 shadow-sm"
                >
                  <Trash2 size={18} /> {t('common.delete')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Navigation />
    </div>
  );
}
