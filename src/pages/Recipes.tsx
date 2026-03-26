import { useState, useEffect } from 'react';
import { ChefHat, Loader2, ShoppingCart, CheckCircle2, Calendar, Utensils, ChevronRight, ChevronDown, Heart, Star, X, Link2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Recipe } from '../types.ts';
import RecipeCard from '../components/RecipeCard';
import { useTranslation } from 'react-i18next';

export default function Recipes() {
  const { t } = useTranslation();
  const [recipe, setRecipe] = useState<Recipe | null>(() => {
    const saved = localStorage.getItem('currentRecipe');
    return saved ? JSON.parse(saved) : null;
  });
  const [weeklyPlan, setWeeklyPlan] = useState<any[]>(() => {
    const saved = localStorage.getItem('currentWeeklyPlan');
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState(() => localStorage.getItem('recipePreferences') || '');
  const [portions, setPortions] = useState(() => parseInt(localStorage.getItem('recipePortions') || '2'));
  const [targetDate, setTargetDate] = useState(() => localStorage.getItem('recipeTargetDate') || new Date().toISOString().split('T')[0]);
  const [mode, setMode] = useState<'single' | 'weekly'>(() => (localStorage.getItem('recipeMode') as 'single' | 'weekly') || 'single');
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [cookedResult, setCookedResult] = useState<any>(null);
  const [allowExtra, setAllowExtra] = useState(false);
  const [maxExtraItems, setMaxExtraItems] = useState(3);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    if (recipe) localStorage.setItem('currentRecipe', JSON.stringify(recipe));
    else localStorage.removeItem('currentRecipe');
  }, [recipe]);

  useEffect(() => {
    if (weeklyPlan.length > 0) localStorage.setItem('currentWeeklyPlan', JSON.stringify(weeklyPlan));
    else localStorage.removeItem('currentWeeklyPlan');
  }, [weeklyPlan]);

  useEffect(() => {
    localStorage.setItem('recipePreferences', preferences);
  }, [preferences]);

  useEffect(() => {
    localStorage.setItem('recipePortions', portions.toString());
  }, [portions]);

  useEffect(() => {
    localStorage.setItem('recipeTargetDate', targetDate);
  }, [targetDate]);

  useEffect(() => {
    localStorage.setItem('recipeMode', mode);
  }, [mode]);

  useEffect(() => { fetchFavorites(); }, []);

  const fetchFavorites = async () => {
    try {
      const res = await fetch('/api/recipes/favorites');
      if (res.ok) setFavorites(await res.json());
    } catch (e) {}
  };

  const fetchWeeklyPlan = async () => {
    try {
      const res = await fetch('/api/recipes/weekly');
      if (res.ok) {
        const data = await res.json();
        // Only set if we don't have one already, or if we want to refresh
        if (weeklyPlan.length === 0) {
           setWeeklyPlan(data.plan || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch weekly plan');
    }
  };

  const generateRecipe = async () => {
    setLoading(true);
    setRecipe(null);
    setCookedResult(null);
    setMode('single');
    try {
      const res = await fetch('/api/recipes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences, portions, allowExtra, maxExtraItems })
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setRecipe(data);
    } catch (error) {
      toast.error(t('recipes.errorGeneratingRecipe'));
    } finally {
      setLoading(false);
    }
  };

  const generateWeeklyPlan = async () => {
    setLoading(true);
    setWeeklyPlan([]);
    setCookedResult(null);
    setMode('weekly');
    try {
      const res = await fetch('/api/recipes/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences, portions })
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setWeeklyPlan(data.plan);
      toast.success(t('recipes.weeklyPlanGenerated'));
    } catch (error) {
      toast.error(t('recipes.errorGeneratingWeeklyPlan'));
    } finally {
      setLoading(false);
    }
  };

  const handleCook = async (targetRecipe: Recipe) => {
    try {
      const res = await fetch('/api/recipes/cook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usedIngredients: targetRecipe.ingredients })
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setCookedResult(data);
      toast.success(t('recipes.enjoyMealInventoryUpdated'));
    } catch (error) {
      toast.error(t('recipes.errorUpdatingInventory'));
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
    } catch (error) {
      toast.error(t('recipes.errorAddingToBring'));
    }
  };

  const addToBringFromRecipe = async (targetRecipe: Recipe) => {
    const missingItems = targetRecipe.ingredients.filter(i => !i.in_inventory).map(i => i.name);
    if (missingItems.length === 0) {
      toast.success(t('recipes.allIngredientsAvailable'));
      return;
    }
    await addToBring(missingItems);
  };

  const saveAsFavorite = async (targetRecipe: Recipe) => {
    try {
      const res = await fetch('/api/recipes/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...targetRecipe, portions })
      });
      if (res.ok) {
        toast.success(t('recipes.savedAsFavorite'));
        fetchFavorites();
      }
    } catch (e) { toast.error(t('common.errorSaving')); }
  };

  const deleteFavorite = async (id: number) => {
    try {
      await fetch(`/api/recipes/favorites/${id}`, { method: 'DELETE' });
      setFavorites(favorites.filter(f => f.id !== id));
      toast.success(t('recipes.favoriteRemoved'));
    } catch (e) { toast.error(t('common.error')); }
  };

  const importFromUrl = async () => {
    if (!importUrl.trim()) return;
    setLoading(true);
    setRecipe(null);
    setMode('single');
    setShowImport(false);
    try {
      const res = await fetch('/api/recipes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Import failed');
      }
      const data = await res.json();
      setRecipe(data);
      setImportUrl('');
      toast.success(t('recipes.importSuccess'));
    } catch (error: any) {
      toast.error(error.message || t('recipes.importError'));
    } finally {
      setLoading(false);
    }
  };

  const addToCalendarSingle = async () => {
    if (!recipe) return;
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: targetDate,
          title: recipe.title,
          description: recipe.description,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          portions: portions,
          base_portions: portions
        })
      });
      if (res.ok) {
        toast.success(t('recipes.addedToCalendar'));
        setRecipe(null);
      }
    } catch (e) {
      toast.error(t('common.errorSaving'));
    }
  };

  const addToCalendarWeekly = async () => {
    if (!weeklyPlan.length) return;
    try {
      const res = await fetch('/api/calendar/week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: targetDate,
          recipes: weeklyPlan,
          portions: portions
        })
      });
      if (res.ok) {
        toast.success(t('recipes.weekSavedToCalendar'));
        setWeeklyPlan([]);
      }
    } catch (e) {
      toast.error(t('common.errorSaving'));
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto pb-24">
      <header className="mb-8 pt-4">
        <h1 className="text-2xl font-bold tracking-widest text-gray-900">{t('recipes.title')}</h1>
      </header>

      {!cookedResult && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="space-y-4">
            <div className="flex space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recipes.dateStart')}</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="w-32">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recipes.portionsLabel')}</label>
                <input
                  type="number"
                  min="1"
                  value={portions}
                  onChange={e => setPortions(parseInt(e.target.value) || 1)}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('recipes.preferencesLabel')}</label>
              <textarea
                value={preferences}
                onChange={e => setPreferences(e.target.value)}
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none resize-none h-24"
                placeholder={t('recipes.preferencesPlaceholder')}
              />
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4">
              <div>
                <label className="text-sm font-medium text-gray-700">{t('recipes.allowExtraIngredients')}</label>
                <p className="text-xs text-gray-400">{t('recipes.allowExtraDescription')}</p>
              </div>
              <button
                onClick={() => setAllowExtra(!allowExtra)}
                className={`w-12 h-7 rounded-full transition-colors ${allowExtra ? 'bg-emerald-500' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform mx-1 ${allowExtra ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            {allowExtra && (
              <div className="bg-gray-50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">{t('recipes.maxExtraIngredients')}</label>
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-sm font-bold">{maxExtraItems}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={maxExtraItems}
                  onChange={e => setMaxExtraItems(parseInt(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
            )}
            <div className="flex space-x-3">
              <button
                onClick={generateRecipe}
                disabled={loading}
                className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-semibold flex items-center justify-center space-x-2 hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-lg shadow-emerald-100"
              >
                {loading && mode === 'single' ? <Loader2 className="animate-spin" size={20} /> : <Utensils size={20} />}
                <span>{t('recipes.singleRecipe')}</span>
              </button>
              <button
                onClick={generateWeeklyPlan}
                disabled={loading}
                className="flex-1 bg-gray-900 text-white py-4 rounded-2xl font-semibold flex items-center justify-center space-x-2 hover:bg-gray-800 transition-colors disabled:opacity-50 shadow-lg shadow-gray-200"
              >
                {loading && mode === 'weekly' ? <Loader2 className="animate-spin" size={20} /> : <Calendar size={20} />}
                <span>{t('recipes.weeklyPlan')}</span>
              </button>
            </div>

            {/* Import from URL */}
            <button
              onClick={() => setShowImport(!showImport)}
              className="w-full py-3 text-sm font-medium text-gray-500 hover:text-emerald-600 flex items-center justify-center gap-2 transition-colors"
            >
              <Link2 size={16} />
              {t('recipes.importFromUrl')}
            </button>

            {showImport && (
              <div className="flex gap-2">
                <input
                  type="url"
                  value={importUrl}
                  onChange={e => setImportUrl(e.target.value)}
                  placeholder={t('recipes.importUrlPlaceholder')}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  onKeyDown={e => e.key === 'Enter' && importFromUrl()}
                />
                <button
                  onClick={importFromUrl}
                  disabled={loading || !importUrl.trim()}
                  className="px-6 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {t('recipes.import')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="animate-spin text-emerald-600" size={48} />
          <p className="text-gray-500 font-medium">{t('recipes.aiCreatingPlan')}</p>
        </div>
      )}

      {!loading && !cookedResult && mode === 'single' && recipe && (
        <div className="space-y-4">
          <RecipeCard
            recipe={recipe}
            onCook={() => handleCook(recipe)}
            onBring={() => addToBringFromRecipe(recipe)}
            onBack={() => setRecipe(null)}
          />
          <div className="flex space-x-3">
            <button
              onClick={() => saveAsFavorite(recipe)}
              className="flex-1 bg-orange-50 text-orange-600 py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-orange-100 transition-colors border border-orange-200"
            >
              <Heart size={20} />
              <span>{t('recipes.favorite')}</span>
            </button>
            <button
              onClick={addToCalendarSingle}
              className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
            >
              <Calendar size={20} />
              <span>{t('recipes.addToCalendar')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Favorites Section */}
      {!loading && !cookedResult && !recipe && weeklyPlan.length === 0 && favorites.length > 0 && (
        <div className="mt-8">
          <button onClick={() => setShowFavorites(!showFavorites)} className="flex items-center space-x-2 mb-4 group">
            <Star size={18} className="text-orange-500" />
            <h2 className="text-lg font-bold text-gray-900">{t('recipes.favorites')}</h2>
            <span className="bg-orange-100 text-orange-600 text-xs px-2 py-0.5 rounded-full font-bold">{favorites.length}</span>
            {showFavorites ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
          </button>
          {showFavorites && (
            <div className="space-y-3">
              {favorites.map((fav: any) => (
                <div key={fav.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-900">{fav.title}</h3>
                    <button onClick={() => deleteFavorite(fav.id)} className="text-gray-300 hover:text-red-500 p-1"><X size={16} /></button>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{fav.description}</p>
                  <div className="flex space-x-2">
                    <button onClick={() => { setRecipe(fav); setMode('single'); }} className="flex-1 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-bold hover:bg-emerald-100">{t('recipes.showFavorite')}</button>
                    <button onClick={() => handleCook(fav)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200">{t('recipes.cookFavorite')}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && !cookedResult && mode === 'weekly' && weeklyPlan.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-bold">{t('recipes.yourWeeklyPlan')}</h2>
            <button
              onClick={addToCalendarWeekly}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold flex items-center space-x-2 hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Calendar size={16} />
              <span>{t('recipes.saveWeek')}</span>
            </button>
          </div>
          {weeklyPlan.map((dayRecipe, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <button
                onClick={() => setExpandedDay(expandedDay === idx ? null : idx)}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-sm">
                    {dayRecipe.day.substring(0, 2)}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">{dayRecipe.day}</p>
                    <h3 className="font-semibold text-gray-900">{dayRecipe.title}</h3>
                  </div>
                </div>
                {expandedDay === idx ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
              </button>

              {expandedDay === idx && (
                <div className="p-5 border-t border-gray-50 bg-gray-50/30">
                  <RecipeCard
                    recipe={dayRecipe}
                    onCook={() => handleCook(dayRecipe)}
                    onBring={() => addToBringFromRecipe(dayRecipe)}
                    compact
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {cookedResult && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center space-y-6 animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={40} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{t('recipes.enjoyYourMeal')}</h2>
          <p className="text-gray-600">
            {t('recipes.ingredientsDeducted')}
          </p>

          {cookedResult.missing.length > 0 && (
            <div className="mt-8 text-left bg-orange-50 p-6 rounded-2xl border border-orange-100">
              <h3 className="font-semibold text-orange-800 mb-2 flex items-center">
                <ShoppingCart size={18} className="mr-2" />
                {t('recipes.addToShoppingList')}
              </h3>
              <p className="text-sm text-orange-700 mb-4">
                {t('recipes.ingredientsEmptyOrMissing')}
              </p>
              <ul className="list-disc pl-5 mb-4 text-sm text-orange-800 space-y-1">
                {cookedResult.missing.map((m: string, i: number) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
              <button
                onClick={() => addToBring(cookedResult.missing)}
                className="w-full bg-orange-600 text-white py-3 rounded-xl font-medium shadow-sm hover:bg-orange-700 transition-colors"
              >
                {t('recipes.addToBring')}
              </button>
            </div>
          )}

          <button
            onClick={() => setCookedResult(null)}
            className="w-full py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold mt-4"
          >
            {t('common.back')}
          </button>
        </div>
      )}
    </div>
  );
}
