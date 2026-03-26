import { useState, useEffect } from 'react';
import { Heart, Trash2, ChefHat, Calendar, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Recipe } from '../types.ts';
import RecipeCard from '../components/RecipeCard';
import { useTranslation } from 'react-i18next';

export default function Favorites() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [cookedResult, setCookedResult] = useState<any>(null);

  useEffect(() => { fetchFavorites(); }, []);

  const fetchFavorites = async () => {
    try {
      const res = await fetch('/api/recipes/favorites');
      if (res.ok) setFavorites(await res.json());
    } catch (e) {
      toast.error(t('common.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const deleteFavorite = async (id: number) => {
    if (!confirm(t('recipes.confirmDeleteFavorite') || 'Favorit wirklich löschen?')) return;
    try {
      await fetch(`/api/recipes/favorites/${id}`, { method: 'DELETE' });
      setFavorites(favorites.filter(f => f.id !== id));
      toast.success(t('recipes.favoriteRemoved'));
    } catch (e) {
      toast.error(t('common.errorDeleting'));
    }
  };

  const handleCook = async (recipe: any) => {
    try {
      const res = await fetch('/api/recipes/cook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usedIngredients: recipe.ingredients })
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setCookedResult(data);
      toast.success(t('recipes.enjoyMealInventoryUpdated'));
    } catch (e) {
      toast.error(t('recipes.errorUpdatingInventory'));
    }
  };

  const addToCalendar = async (recipe: any) => {
    const date = new Date().toISOString().split('T')[0];
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          title: recipe.title,
          description: recipe.description,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          portions: recipe.portions || 2
        })
      });
      if (res.ok) {
        toast.success(t('recipes.addedToCalendar'));
      }
    } catch (e) {
      toast.error(t('common.errorSaving'));
    }
  };

  const addToBring = async (items: string[]) => {
    try {
      const res = await fetch('/api/bring/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(t('recipes.addedToBring'));
    } catch (e) {
      toast.error(t('recipes.errorAddingToBring'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  // Show cooked result
  if (cookedResult) {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
          <ChefHat size={48} className="mx-auto text-emerald-600 mb-3" />
          <h2 className="text-xl font-bold text-emerald-800 mb-2">{t('recipes.mealCooked')}</h2>
          <p className="text-sm text-emerald-600">{t('recipes.inventoryUpdated')}</p>
        </div>
        {cookedResult.missing?.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <h3 className="font-bold text-orange-800 mb-2">{t('recipes.missingIngredients')}</h3>
            <ul className="text-sm text-orange-700 space-y-1">
              {cookedResult.missing.map((item: string, i: number) => (
                <li key={i}>- {item}</li>
              ))}
            </ul>
            <button
              onClick={() => addToBring(cookedResult.missing)}
              className="mt-3 w-full py-2 bg-orange-100 text-orange-700 rounded-xl text-sm font-bold hover:bg-orange-200"
            >
              {t('recipes.addMissingToBring')}
            </button>
          </div>
        )}
        <button
          onClick={() => setCookedResult(null)}
          className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200"
        >
          {t('common.back')}
        </button>
      </div>
    );
  }

  // Show selected recipe detail
  if (selectedRecipe) {
    const parsed: Recipe = {
      ...selectedRecipe,
      ingredients: typeof selectedRecipe.ingredients === 'string' ? JSON.parse(selectedRecipe.ingredients) : selectedRecipe.ingredients,
      instructions: typeof selectedRecipe.instructions === 'string' ? JSON.parse(selectedRecipe.instructions) : selectedRecipe.instructions
    };
    return (
      <div className="p-4">
        <RecipeCard
          recipe={parsed}
          onCook={() => handleCook(parsed)}
          onBring={() => addToBring(parsed.ingredients.filter((i: any) => !i.in_inventory).map((i: any) => i.name))}
          onBack={() => setSelectedRecipe(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Heart size={24} className="text-rose-500" />
            {t('recipes.favorites')}
          </h1>
          <span className="bg-rose-100 text-rose-600 text-xs px-2 py-0.5 rounded-full font-bold">{favorites.length}</span>
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Heart size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-medium">{t('recipes.noFavorites') || 'Noch keine Favoriten gespeichert'}</p>
          <p className="text-sm mt-1">{t('recipes.noFavoritesHint') || 'Speichere Rezepte als Favorit um sie hier zu sehen'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {favorites.map((fav: any) => (
            <div key={fav.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 cursor-pointer" onClick={() => setSelectedRecipe(fav)}>
                  <h3 className="font-bold text-gray-900">{fav.title}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{fav.description}</p>
                </div>
                <button onClick={() => deleteFavorite(fav.id)} className="text-gray-300 hover:text-red-500 p-1 ml-2 shrink-0">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex space-x-2 mt-3">
                <button
                  onClick={() => setSelectedRecipe(fav)}
                  className="flex-1 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-100 flex items-center justify-center gap-1.5"
                >
                  <ChefHat size={14} />
                  {t('recipes.showFavorite')}
                </button>
                <button
                  onClick={() => addToCalendar(fav)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 flex items-center justify-center gap-1.5"
                >
                  <Calendar size={14} />
                  {t('recipes.addToCalendar')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
