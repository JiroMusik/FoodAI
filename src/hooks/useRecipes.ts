import { useState, useCallback } from 'react';
import { recipeApi } from '../api/client';
import { Recipe } from '../types';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export function useRecipes() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [weeklyPlan, setWeeklyPlan] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);

  const fetchFavorites = useCallback(async () => {
    try {
      const data = await recipeApi.getFavorites();
      setFavorites(data);
    } catch (error) {
      toast.error(t('recipes.errorLoadingFavorites'));
    }
  }, [t]);

  const generateRecipe = async (params: any) => {
    setLoading(true);
    try {
      const data = await recipeApi.generate(params);
      setRecipe(data);
      toast.success(t('recipes.recipeGenerated'));
      return data;
    } catch (error) {
      toast.error(t('recipes.errorGeneratingRecipe'));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const generateWeeklyPlan = async (params: any) => {
    setLoading(true);
    try {
      const data = await recipeApi.generateWeekly(params);
      setWeeklyPlan(data.plan);
      toast.success(t('recipes.weeklyPlanGenerated'));
      return data.plan;
    } catch (error) {
      toast.error(t('recipes.errorGeneratingWeeklyPlan'));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const saveFavorite = async (recipe: any) => {
    try {
      await recipeApi.addFavorite(recipe);
      fetchFavorites();
      toast.success(t('recipes.addedToFavorites'));
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const deleteFavorite = async (id: number) => {
    try {
      await recipeApi.deleteFavorite(id);
      setFavorites(prev => prev.filter(f => f.id !== id));
      toast.success(t('common.deleted'));
    } catch (error) {
      toast.error(t('common.errorDeleting'));
    }
  };

  return {
    recipe,
    setRecipe,
    weeklyPlan,
    setWeeklyPlan,
    favorites,
    loading,
    setLoading,
    fetchFavorites,
    generateRecipe,
    generateWeeklyPlan,
    saveFavorite,
    deleteFavorite
  };
}
