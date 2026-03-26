import { useState, useCallback } from 'react';
import { inventoryApi } from '../api/client';
import { InventoryItem } from '../types';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export function useInventory() {
  const { t } = useTranslation();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await inventoryApi.getAll();
      setItems(data);
    } catch (error) {
      toast.error(t('inventory.errorLoadingInventory'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const addItem = async (item: Partial<InventoryItem>) => {
    try {
      const newItem = await inventoryApi.add(item);
      setItems(prev => [...prev, newItem]);
      toast.success(t('common.saved'));
      return newItem;
    } catch (error) {
      toast.error(t('common.errorSaving'));
      throw error;
    }
  };

  const updateItem = async (id: number, updates: Partial<InventoryItem>) => {
    try {
      await inventoryApi.update(id, updates);
      setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
      toast.success(t('common.updated'));
    } catch (error) {
      toast.error(t('common.errorSaving'));
      throw error;
    }
  };

  const deleteItem = async (id: number) => {
    if (!window.confirm(t('inventory.confirmDeletePackage'))) return;
    try {
      await inventoryApi.delete(id);
      setItems(prev => prev.filter(item => item.id !== id));
      toast.success(t('common.deleted'));
    } catch (error) {
      toast.error(t('common.errorDeleting'));
    }
  };

  const openPackage = async (id: number) => {
    try {
      const updatedItem = await inventoryApi.open(id);
      setItems(prev => prev.map(item => item.id === id ? updatedItem : item));
      toast.success(t('inventory.markedAsOpened'));
      return updatedItem;
    } catch (error) {
      toast.error(t('common.error'));
      throw error;
    }
  };

  const bulkDelete = async (ids: number[]) => {
    if (!window.confirm(`${ids.length} Artikel wirklich löschen?`)) return;
    try {
      await inventoryApi.bulkDelete(ids);
      setItems(prev => prev.filter(item => !ids.includes(item.id)));
      toast.success(t('common.deleted'));
    } catch (error) {
      toast.error(t('common.errorDeleting'));
    }
  };

  const bulkUpdate = async (ids: number[], updates: Partial<InventoryItem>) => {
    try {
      await inventoryApi.bulkUpdate(ids, updates);
      setItems(prev => prev.map(item => ids.includes(item.id) ? { ...item, ...updates } : item));
      toast.success(t('common.updated'));
    } catch (error) {
      toast.error(t('common.errorUpdating'));
    }
  };

  return {
    items,
    setItems,
    loading,
    fetchInventory,
    addItem,
    updateItem,
    deleteItem,
    openPackage,
    bulkDelete,
    bulkUpdate
  };
}
