import { useState, useEffect } from 'react';
import { ChefHat, Loader2, ShoppingCart, CheckCircle2, Calendar, Utensils, ChevronRight, ChevronDown, Heart, Star, X, Link2, Save, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Recipe } from '../types.ts';
import RecipeCard from '../components/RecipeCard';
import Navigation from '../components/Navigation';
import { useRecipes } from '../hooks/useRecipes';
import { useCalendar } from '../hooks/useCalendar';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';

export default function Recipes() {
  const { t, i18n } = useTranslation();
  const {
    recipe,
    setRecipe,
    weeklyPlan,
    setWeeklyPlan,
    favorites,
    loading,
    setLoading,
    fetchFavorites,
    generateRecipe: apiGenerateRecipe,
    generateWeeklyPlan: apiGenerateWeeklyPlan,
    saveFavorite,
    deleteFavorite
  } = useRecipes();

  const { addRecipe, addWeek } = useCalendar();

  const [preferences, setPreferences] = useState(() => localStorage.getItem('recipePreferences') || '');
  const [portions, setPortions] = useState(() => parseInt(localStorage.getItem('recipePortions') || '2'));
  const [targetDate, setTargetDate] = useState(() => localStorage.getItem('recipeTargetDate') || new Date().toISOString().split('T')[0]);
  const [mode, setMode] = useState<'single' | 'weekly'>(() => (localStorage.getItem('recipeMode') as 'single' | 'weekly') || 'single');
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [allowExtra, setAllowExtra] = useState(false);
  const [maxExtraItems, setMaxExtraItems] = useState(3);
  const [importUrl, setImportUrl] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [planDaysCount, setPlanDaysCount] = useState(7);
  const [planSettings, setPlanSettings] = useState<{ date: string, meals: number, portions: number }[]>([]);

  useEffect(() => {
    localStorage.setItem('recipePreferences', preferences);
    localStorage.setItem('recipePortions', portions.toString());
    localStorage.setItem('recipeTargetDate', targetDate);
    localStorage.setItem('recipeMode', mode);
  }, [preferences, portions, targetDate, mode]);

  useEffect(() => {
    const newSettings = [];
    for (let i = 0; i < planDaysCount; i++) {
      const d = new Date(targetDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const existing = planSettings.find(s => s.date === dateStr);
      newSettings.push(existing || { date: dateStr, meals: 1, portions: portions });
    }
    setPlanSettings(newSettings);
  }, [targetDate, planDaysCount, portions]);

  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  const handleGenerateRecipe = async () => {
    setMode('single');
    try {
      await apiGenerateRecipe({ preferences, portions, allowExtra, maxExtraItems });
    } catch (e) {}
  };

  const handleGenerateWeekly = async () => {
    setMode('weekly');
    setShowWeeklyModal(false);
    try {
      await apiGenerateWeeklyPlan({ preferences, planSettings, allowExtra, maxExtraItems });
    } catch (e) {}
  };

  const handleImport = async () => {
    if (!importUrl) return;
    setLoading(true);
    try {
      const res = await fetch('/api/recipes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl })
      });
      if (!res.ok) throw new Error('Import failed');
      const data = await res.json();
      setRecipe(data);
      setMode('single');
      setShowImport(false);
      setImportUrl('');
      toast.success(t('recipes.importSuccess'));
    } catch (e) {
      toast.error(t('recipes.importError'));
    } finally {
      setLoading(false);
    }
  };

  const addToBringFromRecipe = async (targetRecipe: Recipe) => {
    try {
      const res = await fetch('/api/recipes/missing-ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ingredients: targetRecipe.ingredients, 
          portions: portions,
          base_portions: targetRecipe.base_portions || portions
        })
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const missingItems = data.missingIngredients.map((i: any) => `${i.name} (${i.amountNeeded} ${i.unit})`);
      if (missingItems.length === 0) {
        toast.success(t('recipes.allIngredientsAvailable'));
        return;
      }
      // Send to Bring API
      await fetch('/api/bring/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: missingItems })
      });
      toast.success(t('shopping.addedToBringList'));
    } catch (error) {
      toast.error(t('recipes.errorAddingToBring'));
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto pb-32">
      <header className="flex justify-between items-center mb-8 pt-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight text-gray-900">{t('recipes.title')}</h1>
          <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100 font-bold text-xs">
            AI
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className={`p-3 rounded-2xl transition-all ${showFavorites ? 'bg-orange-500 text-white shadow-lg' : 'bg-white border border-gray-100 text-orange-500 shadow-sm'}`}
          >
            <Star size={20} />
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="p-3 bg-white border border-gray-100 text-emerald-600 rounded-2xl shadow-sm hover:bg-emerald-50 transition-all"
          >
            <Link2 size={20} />
          </button>
        </div>
      </header>

      {showImport && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8 animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">{t('recipes.importTitle')}</h2>
            <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="https://www.gutekueche.de/..."
              value={importUrl}
              onChange={e => setImportUrl(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            />
            <button
              onClick={handleImport}
              disabled={loading || !importUrl}
              className="bg-emerald-600 text-white px-6 rounded-xl font-bold disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : t('common.import')}
            </button>
          </div>
        </div>
      )}

      {showFavorites && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 animate-in slide-in-from-top-4 duration-300">
          {favorites.length === 0 ? (
            <div className="col-span-full bg-orange-50 text-orange-600 p-8 rounded-3xl text-center border border-orange-100">
              {t('recipes.noFavorites')}
            </div>
          ) : (
            favorites.map(fav => (
              <div key={fav.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 relative group">
                <button 
                  onClick={() => deleteFavorite(fav.id)}
                  className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
                <h3 className="font-bold text-gray-900 mb-2 pr-8">{fav.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 mb-4">{fav.description}</p>
                <button
                  onClick={() => { setRecipe(fav); setMode('single'); setShowFavorites(false); }}
                  className="w-full bg-emerald-50 text-emerald-600 py-2 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
                >
                  {t('recipes.viewRecipe')}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="group">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 group-focus-within:text-emerald-500 transition-colors">{t('recipes.portionsLabel')}</label>
            <input
              type="number"
              min="1"
              value={portions}
              onChange={e => setPortions(parseInt(e.target.value) || 1)}
              className="w-full border-b-2 border-gray-100 py-3 focus:border-emerald-500 focus:outline-none text-xl font-semibold bg-transparent transition-colors"
            />
          </div>
          <div className="group">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 group-focus-within:text-emerald-500 transition-colors">{t('recipes.preferencesLabel')}</label>
            <input
              type="text"
              value={preferences}
              onChange={e => setPreferences(e.target.value)}
              placeholder={t('recipes.preferencesPlaceholder')}
              className="w-full border-b-2 border-gray-100 py-3 focus:border-emerald-500 focus:outline-none text-xl font-semibold bg-transparent transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleGenerateRecipe}
            disabled={loading}
            className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 active:scale-95"
          >
            {loading && mode === 'single' ? <Loader2 className="animate-spin" size={24} /> : <Utensils size={24} />}
            {t('recipes.singleRecipe')}
          </button>
          <button
            onClick={() => setShowWeeklyModal(true)}
            disabled={loading}
            className="flex-1 bg-gray-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 disabled:opacity-50 active:scale-95"
          >
            <Calendar size={24} />
            {t('recipes.weeklyPlan')}
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
            <ChefHat size={40} className="text-emerald-500" />
          </div>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">{t('recipes.aiCreatingPlan')}</p>
        </div>
      )}

      {!loading && mode === 'single' && recipe && (
        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
          <RecipeCard
            recipe={recipe}
            onCook={() => toast.error('Please add to calendar first')}
            onBring={() => addToBringFromRecipe(recipe)}
            onBack={() => setRecipe(null)}
          />
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => saveFavorite(recipe)}
              className="bg-orange-50 text-orange-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-orange-100 transition-colors border border-orange-100"
            >
              <Heart size={20} />
              {t('recipes.favorite')}
            </button>
            <button
              onClick={() => { addRecipe({ ...recipe, date: targetDate, portions }); setRecipe(null); }}
              className="bg-emerald-50 text-emerald-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors border border-emerald-100"
            >
              <Calendar size={20} />
              {t('recipes.toCalendar')}
            </button>
          </div>
        </div>
      )}

      {!loading && mode === 'weekly' && weeklyPlan.length > 0 && (
        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">{t('recipes.yourWeeklyPlan')}</h2>
            <div className="flex gap-2">
              <button onClick={() => setWeeklyPlan([])} className="bg-gray-100 text-gray-500 px-4 py-2 rounded-xl font-bold hover:bg-gray-200 transition-colors text-sm">
                {t('common.cancel')}
              </button>
              <button onClick={() => addWeek({ recipes: weeklyPlan, startDate: targetDate })} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors text-sm shadow-md">
                <Save size={16} />
                {t('recipes.saveWeek')}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {weeklyPlan.map((dayRecipe, idx) => (
              <div key={idx} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setExpandedDay(expandedDay === idx ? null : idx)}
                  className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center font-bold text-sm">
                      {new Date(dayRecipe.date).toLocaleDateString(i18n.language === 'de' ? 'de-DE' : 'en-US', { weekday: 'short' })}
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">{dayRecipe.day}</p>
                      <h3 className="font-bold text-gray-900 truncate max-w-[200px]">{dayRecipe.title}</h3>
                    </div>
                  </div>
                  {expandedDay === idx ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
                </button>
                <AnimatePresence>
                  {expandedDay === idx && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="border-t border-gray-50 p-6 bg-gray-50/30">
                      <RecipeCard recipe={dayRecipe} onCook={() => {}} onBring={() => addToBringFromRecipe(dayRecipe)} compact />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      )}

      {showWeeklyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowWeeklyModal(false)}>
          <div className="bg-white w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-white">
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                <Calendar className="text-emerald-600" size={28} />
                Wochenplan
              </h2>
              <button onClick={() => setShowWeeklyModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 space-y-8">
              <div className="flex gap-4">
                <div className="flex-1 group">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 group-focus-within:text-emerald-500 transition-colors">{t('recipes.dateStart')}</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold text-gray-800 shadow-inner"
                  />
                </div>
                <div className="w-28 group">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 group-focus-within:text-emerald-500 transition-colors">Tage</label>
                  <input
                    type="number"
                    min="1"
                    max="14"
                    value={planDaysCount}
                    onChange={e => setPlanDaysCount(parseInt(e.target.value) || 1)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold text-gray-800 shadow-inner text-center"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Details pro Tag</label>
                {planSettings.map((setting, index) => (
                  <div key={setting.date} className="flex items-center gap-4 bg-gray-50 p-4 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="w-14 shrink-0 text-center flex flex-col">
                      <span className="text-[10px] font-black text-emerald-600 uppercase">
                        {new Date(setting.date).toLocaleDateString(i18n.language === 'de' ? 'de-DE' : 'en-US', { weekday: 'short' })}
                      </span>
                      <span className="text-xs font-bold text-gray-400">
                        {new Date(setting.date).toLocaleDateString(i18n.language === 'de' ? 'de-DE' : 'en-US', { day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[8px] font-bold text-gray-300 uppercase mb-1">Essen</label>
                      <select
                        value={setting.meals}
                        onChange={e => {
                          const newSettings = [...planSettings];
                          newSettings[index].meals = parseInt(e.target.value);
                          setPlanSettings(newSettings);
                        }}
                        className="w-full bg-white border border-gray-100 rounded-xl px-2 py-2 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
                      >
                        {[1, 2, 3].map(n => <option key={n} value={n}>{n}x</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[8px] font-bold text-gray-300 uppercase mb-1">Portionen</label>
                      <input
                        type="number"
                        min="1"
                        value={setting.portions}
                        onChange={e => {
                          const newSettings = [...planSettings];
                          newSettings[index].portions = parseInt(e.target.value) || 1;
                          setPlanSettings(newSettings);
                        }}
                        className="w-full bg-white border border-gray-100 rounded-xl px-2 py-2 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none text-center shadow-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8 border-t border-gray-50 bg-white shrink-0">
              <button
                onClick={handleGenerateWeekly}
                className="w-full bg-emerald-600 text-white py-5 rounded-[24px] font-black text-lg uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 active:scale-95"
              >
                Plan Erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      <Navigation />
    </div>
  );
}
