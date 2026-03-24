import { useState, useEffect } from 'react';
import { ShoppingCart, Loader2, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface MissingIngredient {
  name: string;
  amountNeeded: number;
  unit: string;
}

export default function ShoppingList() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [missingItems, setMissingItems] = useState<MissingIngredient[]>([]);
  const [addingToBring, setAddingToBring] = useState(false);

  useEffect(() => {
    fetchShoppingList();
  }, []);

  const fetchShoppingList = async () => {
    try {
      const res = await fetch('/api/shopping-list');
      if (res.ok) {
        const data = await res.json();
        setMissingItems(data.missingIngredients || []);
      }
    } catch (error) {
      toast.error(t('shopping.errorLoadingShoppingList'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddToBring = async () => {
    if (missingItems.length === 0) return;
    setAddingToBring(true);
    try {
      const itemsToAdd = missingItems.map(i => `${i.name} (${i.amountNeeded} ${i.unit})`);
      const res = await fetch('/api/bring/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToAdd })
      });

      if (res.ok) {
        toast.success(t('shopping.addedToBringList'));
      } else {
        const data = await res.json();
        toast.error(data.error || t('shopping.errorSendingToBring'));
      }
    } catch (error) {
      toast.error(t('shopping.errorSendingToBring'));
    } finally {
      setAddingToBring(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto pb-24 space-y-6">
      <header className="flex justify-between items-center mb-6 pt-4">
        <div className="flex items-center gap-2 text-emerald-700">
          <ShoppingCart size={24} />
          <h1 className="text-2xl font-bold tracking-widest text-gray-900">{t('shopping.title')}</h1>
        </div>
        <button
          onClick={handleAddToBring}
          disabled={addingToBring || missingItems.length === 0}
          className="bg-[#E43C31] text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#c93229] transition-colors disabled:opacity-50"
        >
          {addingToBring ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {t('shopping.sendToBring')}
        </button>
      </header>

      {missingItems.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-center">
          <ShoppingCart size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-1">{t('shopping.allStocked')}</h2>
          <p className="text-gray-500 text-sm">{t('shopping.noMissingIngredients')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <ul className="divide-y divide-gray-100">
            {missingItems.map((item, idx) => (
              <li key={idx} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                <span className="font-medium text-gray-800">{item.name}</span>
                <span className="text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-full text-sm">
                  {item.amountNeeded} {item.unit}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
