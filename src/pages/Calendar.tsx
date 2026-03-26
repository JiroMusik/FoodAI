import { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, CheckCircle2, Loader2, Trash2, Users, Camera, Edit2, X, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { PlannedRecipe } from '../types.ts';
import RecipeCard from '../components/RecipeCard';
import OpenedItemsModal from '../components/OpenedItemsModal';
import Navigation from '../components/Navigation';
import { useCalendar } from '../hooks/useCalendar';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';

export default function Calendar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const {
    recipes,
    loading,
    fetchCalendar,
    deleteRecipe,
    updateDate,
    updatePortions,
    cookRecipe
  } = useCalendar();

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showOpenedModal, setShowOpenedModal] = useState(false);
  const [openedItemsToConfirm, setOpenedItemsToConfirm] = useState<any[]>([]);
  const [pendingCookId, setPendingCookId] = useState<number | null>(null);
  const [editingDateId, setEditingDateId] = useState<number | null>(null);
  const [editDateValue, setEditDateValue] = useState<string>('');

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, PlannedRecipe[]> = {};
    recipes.forEach(r => {
      if (!groups[r.date]) groups[r.date] = [];
      groups[r.date].push(r);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [recipes]);

  const handleCook = async (recipe: PlannedRecipe) => {
    try {
      const res = await fetch('/api/cook/check-opened', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: recipe.ingredients })
      });
      const data = await res.json();
      if (data.openedItems?.length > 0) {
        setOpenedItemsToConfirm(data.openedItems);
        setPendingCookId(recipe.id);
        setShowOpenedModal(true);
      } else {
        await cookRecipe(recipe.id, []);
      }
    } catch (e) {
      await cookRecipe(recipe.id, []);
    }
  };

  const handleUpdateDate = async (id: number) => {
    if (!editDateValue) {
      setEditingDateId(null);
      return;
    }
    await updateDate(id, editDateValue);
    setEditingDateId(null);
  };

  if (loading && recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <Loader2 className="animate-spin text-emerald-500 mb-4" size={48} />
        <p className="text-gray-500 font-medium">{t('calendar.loadingCalendar')}</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto pb-32">
      <header className="flex justify-between items-center mb-8 pt-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight text-gray-900">{t('calendar.title')}</h1>
          <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100 font-bold text-xs">
            {recipes.length}
          </div>
        </div>
        <button
          onClick={() => navigate('/free-cook')}
          className="bg-emerald-100 text-emerald-700 px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-200 transition-all active:scale-95"
        >
          <Camera size={18} />
          {t('calendar.freeCook')}
        </button>
      </header>

      {recipes.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[32px] border border-dashed border-gray-200">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
            <CalendarIcon size={40} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">{t('calendar.emptyTitle')}</h3>
          <p className="text-gray-500 text-sm max-w-xs mx-auto">{t('calendar.emptySubtitle')}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedByDate.map(([date, dateRecipes]) => (
            <div key={date} className="space-y-3">
              <div className="flex items-center gap-3 px-2">
                <div className="h-px flex-1 bg-gray-100"></div>
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                  {new Date(date).toLocaleDateString(i18n.language === 'de' ? 'de-DE' : 'en-US', { weekday: 'long', day: '2-digit', month: 'long' })}
                </h2>
                <div className="h-px flex-1 bg-gray-100"></div>
              </div>

              <div className="space-y-3">
                {dateRecipes.map((recipe) => (
                  <div key={recipe.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className={`p-5 flex items-center justify-between ${recipe.cooked ? 'bg-emerald-50/30' : ''}`}>
                      <div className="flex-1 min-w-0" onClick={() => setExpandedId(expandedId === recipe.id ? null : recipe.id)}>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className={`font-bold text-lg truncate ${recipe.cooked ? 'text-emerald-800 line-through opacity-50' : 'text-gray-900'}`}>
                            {recipe.title}
                          </h3>
                          {recipe.cooked && (
                            <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-widest">
                              {t('calendar.cooked')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs font-medium text-gray-400">
                          <div className="flex items-center gap-1">
                            <Users size={14} />
                            <span>{recipe.portions} {t('common.portions')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {expandedId === recipe.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span>{t('calendar.details')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-4">
                        {editingDateId === recipe.id ? (
                          <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                            <input 
                              type="date" 
                              value={editDateValue} 
                              onChange={(e) => setEditDateValue(e.target.value)}
                              className="border border-emerald-200 bg-emerald-50/50 rounded-xl px-3 py-2 text-sm font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <button 
                              onClick={() => handleUpdateDate(recipe.id)}
                              className="p-2 text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-md transition-all active:scale-95"
                            >
                              <CheckCircle2 size={18} />
                            </button>
                            <button 
                              onClick={() => setEditingDateId(null)}
                              className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ) : !recipe.cooked && (
                          <>
                            <button
                              onClick={() => handleCook(recipe)}
                              className="p-3 text-emerald-500 hover:bg-emerald-50 rounded-2xl transition-all active:scale-90"
                              title={t('calendar.markCooked')}
                            >
                              <CheckCircle2 size={24} />
                            </button>
                            <button
                              onClick={() => { setEditingDateId(recipe.id); setEditDateValue(recipe.date); }}
                              className="p-3 text-gray-400 hover:text-emerald-500 hover:bg-gray-50 rounded-2xl transition-all active:scale-90"
                            >
                              <Edit2 size={20} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => deleteRecipe(recipe.id)}
                          className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all active:scale-90"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedId === recipe.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-gray-50 bg-gray-50/30 p-6"
                        >
                          <RecipeCard 
                            recipe={recipe} 
                            onCook={() => handleCook(recipe)}
                            onBring={() => {
                              const missingItems = recipe.ingredients.map((i: any) => `${i.name} (${i.amount} ${i.unit})`);
                              fetch('/api/bring/add', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ items: missingItems })
                              }).then(() => toast.success(t('shopping.addedToBringList')));
                            }}
                            compact
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showOpenedModal && (
          <OpenedItemsModal
            isOpen={showOpenedModal}
            items={openedItemsToConfirm}
            onCancel={() => { setShowOpenedModal(false); setPendingCookId(null); }}
            onConfirm={(updates) => {
              if (pendingCookId) cookRecipe(pendingCookId, updates);
              setShowOpenedModal(false);
              setPendingCookId(null);
            }}
          />
        )}
      </AnimatePresence>

      <Navigation />
    </div>
  );
}
