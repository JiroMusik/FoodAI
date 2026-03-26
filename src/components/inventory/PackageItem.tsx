import React from 'react';
import { Package, Trash2, Loader2, PackageOpen, AlertTriangle, Check, Edit2 } from 'lucide-react';
import { InventoryItem } from '../../types';
import { useTranslation } from 'react-i18next';

interface PackageItemProps {
  item: InventoryItem;
  isEditing: boolean;
  isOpening: boolean;
  isSelected: boolean;
  isBulkMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onOpen: () => void;
  onToggleSelect: () => void;
  onUpdateQuantity: (delta: number) => void;
  renderEditForm: () => React.ReactNode;
}

export const PackageItem: React.FC<PackageItemProps> = ({
  item,
  isEditing,
  isOpening,
  isSelected,
  isBulkMode,
  onEdit,
  onDelete,
  onOpen,
  onToggleSelect,
  onUpdateQuantity,
  renderEditForm
}) => {
  const { t } = useTranslation();

  const getExpiryStatus = (date: string | null) => {
    if (!date) return 'ok';
    const expiry = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = expiry.getTime() - today.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    if (days < 0) return 'expired';
    if (days <= 3) return 'warning';
    return 'ok';
  };

  const expiryStatus = getExpiryStatus(item.expiry_date);

  return (
    <div 
      onClick={() => isBulkMode && onToggleSelect()}
      className={`p-4 transition-all ${
        isBulkMode && isSelected ? 'bg-emerald-50/50' : ''
      }`}
    >
      {isBulkMode && (
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
            isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 bg-white'
          }`}>
            {isSelected && <Check size={14} strokeWidth={4} />}
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {isSelected ? 'Ausgewählt' : 'Auswählen'}
          </span>
        </div>
      )}

      {isEditing ? (
        renderEditForm()
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900 truncate">{item.name}</h3>
              {item.is_open && (
                <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-widest border border-blue-100">
                  {t('inventory.opened')}
                </span>
              )}
              {expiryStatus === 'expired' && (
                <span className="bg-red-50 text-red-600 text-[10px] px-2 py-0.5 rounded-md font-black uppercase tracking-tighter border border-red-100">
                  {t('inventory.expired')}
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <div className="flex items-center gap-1.5 text-gray-500">
                <Package size={14} className="text-gray-400" />
                <span className="text-xs font-bold">{item.quantity} {item.unit}</span>
                {item.package_size && item.package_size !== item.quantity && (
                  <span className="text-[10px] text-gray-300 font-medium">/ {item.package_size}{item.unit}</span>
                )}
              </div>
              
              {item.expiry_date && (
                <div className={`flex items-center gap-1.5 ${
                  expiryStatus === 'warning' ? 'text-orange-500 font-bold' : 
                  expiryStatus === 'expired' ? 'text-red-500 font-bold' : 'text-gray-400'
                }`}>
                  <AlertTriangle size={12} />
                  <span className="text-[10px] uppercase tracking-widest">{t('inventory.expiryLabel')}: {item.expiry_date}</span>
                </div>
              )}

              {item.location && (
                <div className="text-[10px] text-gray-400 font-medium bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                  {item.location}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!item.is_open && item.quantity > 0 && (
              <button 
                onClick={(e) => { e.stopPropagation(); onOpen(); }} 
                disabled={isOpening}
                className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
              >
                {isOpening ? <Loader2 size={18} className="animate-spin" /> : <PackageOpen size={18} />}
              </button>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-2 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
            >
              <Edit2 size={18} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
