import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Check, X, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface OpenedItem {
  id: number;
  name: string;
  days_until_spoiled: number;
}

interface OpenedItemsModalProps {
  isOpen: boolean;
  items: OpenedItem[];
  onConfirm: (updates: { id: number; days: number }[]) => void;
  onCancel: () => void;
}

export default function OpenedItemsModal({ isOpen, items, onConfirm, onCancel }: OpenedItemsModalProps) {
  const { t, i18n } = useTranslation();
  const [selectedItems, setSelectedItems] = useState<Record<number, boolean>>(
    items.reduce((acc, item) => ({ ...acc, [item.id]: true }), {})
  );

  if (!isOpen) return null;

  const dateLocale = t('common.dateLocale');

  const handleConfirm = () => {
    const updates = items
      .filter(item => selectedItems[item.id])
      .map(item => ({ id: item.id, days: item.days_until_spoiled }));
    onConfirm(updates);
  };

  const toggleItem = (id: number) => {
    setSelectedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
              <AlertCircle size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{t('openedItemsModal.title')}</h2>
          </div>

          <p className="text-gray-600 mb-6">
            {t('openedItemsModal.description')}
          </p>

          <div className="space-y-3 mb-8">
            {items.map(item => {
              const newDate = new Date();
              newDate.setDate(newDate.getDate() + item.days_until_spoiled);

              return (
                <div
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${selectedItems[item.id] ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedItems[item.id] ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}>
                      {selectedItems[item.id] && <Check size={12} className="text-white" />}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar size={10} />
                        {t('openedItemsModal.newExpiry', { date: newDate.toLocaleDateString(dateLocale), days: item.days_until_spoiled })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {t('openedItemsModal.skip')}
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 px-4 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              {t('openedItemsModal.adjustAndSave')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
