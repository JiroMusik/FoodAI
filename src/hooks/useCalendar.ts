import { useState, useCallback } from 'react';
import { calendarApi } from '../api/client';
import { PlannedRecipe } from '../types';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export function useCalendar() {
  const { t } = useTranslation();
  const [recipes, setRecipes] = useState<PlannedRecipe[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await calendarApi.get();
      setRecipes(data);
    } catch (error) {
      toast.error(t('calendar.errorLoadingCalendar'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const addRecipe = async (item: any) => {
    try {
      await calendarApi.add(item);
      fetchCalendar();
      toast.success(t('calendar.addedToCalendar'));
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const addWeek = async (data: any) => {
    try {
      await calendarApi.addWeek(data);
      fetchCalendar();
      toast.success(t('recipes.saveWeekSuccess'));
    } catch (error) {
      toast.error(t('recipes.saveWeekError'));
    }
  };

  const deleteRecipe = async (id: number) => {
    try {
      await calendarApi.delete(id);
      setRecipes(prev => prev.filter(r => r.id !== id));
      toast.success(t('common.deleted'));
    } catch (error) {
      toast.error(t('common.errorDeleting'));
    }
  };

  const updateDate = async (id: number, date: string) => {
    try {
      await calendarApi.updateDate(id, date);
      fetchCalendar();
      toast.success(t('common.updated'));
    } catch (error) {
      toast.error(t('common.errorUpdating'));
    }
  };

  const updatePortions = async (id: number, portions: number) => {
    try {
      await calendarApi.updatePortions(id, portions);
      setRecipes(prev => prev.map(r => r.id === id ? { ...r, portions } : r));
      toast.success(t('common.updated'));
    } catch (error) {
      toast.error(t('common.errorUpdating'));
    }
  };

  const cookRecipe = async (id: number, openedUpdates: any[]) => {
    try {
      const data = await calendarApi.cook(id, openedUpdates);
      toast.success(t('calendar.cookedAndDeducted'));
      fetchCalendar();
      return data;
    } catch (error) {
      toast.error(t('calendar.errorCooking'));
      throw error;
    }
  };

  return {
    recipes,
    loading,
    fetchCalendar,
    addRecipe,
    addWeek,
    deleteRecipe,
    updateDate,
    updatePortions,
    cookRecipe
  };
}
