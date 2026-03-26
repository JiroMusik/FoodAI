import React from 'react';
import { ChevronDown, ChevronRight, Package } from 'lucide-react';
import { InventoryItem } from '../../types';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';

interface CategorySectionProps {
  category: string;
  items: InventoryItem[];
  isExpanded: boolean;
  onToggle: () => void;
  renderItem: (item: InventoryItem) => React.ReactNode;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  items,
  isExpanded,
  onToggle,
  renderItem
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-4">
      <button
        onClick={onToggle}
        className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <Package size={24} />
          </div>
          <div className="text-left">
            <h2 className="text-lg font-bold text-gray-900">{category}</h2>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
              {t('inventory.packagesCount', { count: items.length })}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="text-gray-400" />
        ) : (
          <ChevronRight className="text-gray-400" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-50"
          >
            <div className="divide-y divide-gray-50">
              {items.map(renderItem)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
