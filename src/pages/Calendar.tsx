import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, CheckCircle2, Loader2, Trash2, Users, Camera, Edit2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { PlannedRecipe } from '../types.ts';
import RecipeCard from '../components/RecipeCard';
import OpenedItemsModal from '../components/OpenedItemsModal';
import { useTranslation } from 'react-i18next';

export default function Calendar() {
  const { t, i18n } = useTranslation();
  const [recipes, setRecipes] = useState<PlannedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showOpenedModal, setShowOpenedModal] = useState(false);
  const [openedItems, setOpenedItems] = useState<any[]>([]);
  const [pendingCookId, setPendingCookId] = useState<number | null>(null);
  const [editingDateId, setEditingDateId] = useState<number | null>(null);
  const [editDateValue, setEditDateValue] = useState('');
  const navigate = useNavigate();

  const dateLocale = t('common.dateLocale');

  useEffect(() => {
    fetchCalendar();
  }, []);

  const fetchCalendar = async () => {
    try {
      const res = await fetch('/api/calendar');
      if (res.ok) {
        const data = await res.json();
        setRecipes(data);
      }
    } catch (error) {
      toast.error(t('calendar.errorLoadingCalendar'));
    } finally {
      setLoading(false);
    }
  };

  const performCook = async (id: number, openedUpdates: any[]) => {
    try {
      const res = await fetch(`/api/calendar/${id}/cook`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openedUpdates })
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(t('calendar.cookedAndDeducted'));
        if (data.missing?.length > 0) {
          toast.error(t('calendar.wasMissing', { items: data.missing.join(', ') }));
        }
        fetchCalendar();
      }
    } catch (error) {
      toast.error(t('calendar.errorDeducting'));
    }
    setPendingCookId(null);
  };

  const handleCook = async (id: number) => {
    // Check for opened items
    try {
      const checkRes = await fetch('/api/cook/check-opened', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId: id })
      });

      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.updates && checkData.updates.length > 0) {
          const riskyItems = checkData.updates.filter((u: any) => u.needs_new_expiry);
          if (riskyItems.length > 0) {
            setOpenedItems(riskyItems);
            setPendingCookId(id);
            setShowOpenedModal(true);
            return;
          }
        }
      }
    } catch (e) {
      console.error("Failed to check opened items", e);
    }

    performCook(id, []);
  };

  const handleConfirmOpened = (updates: any[]) => {
    setShowOpenedModal(false);
    if (pendingCookId) {
      performCook(pendingCookId, updates);
    }
  };

  const handleUpdateDate = async (id: number) => {
    try {
      const res = await fetch(`/api/calendar/${id}/date`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: editDateValue })
      });
      if (res.ok) {
        toast.success(t('common.saved'));
        setEditingDateId(null);
        fetchCalendar();
      }
    } catch (error) {
      toast.error(t('common.errorSaving'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('calendar.confirmRemoveRecipe'))) return;
    try {
      const res = await fetch(`/api/calendar/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('common.removed'));
        fetchCalendar();
      }
    } catch (error) {
      toast.error(t('common.errorDeleting'));
    }
  };

  const updatePortions = async (id: number, portions: number) => {
    if (portions < 1) return;
    try {
      const res = await fetch(`/api/calendar/${id}/portions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portions })
      });
      if (res.ok) {
        setRecipes(recipes.map(r => r.id === id ? { ...r, portions } : r));
      }
    } catch (error) {
      toast.error(t('common.errorUpdating'));
    }
  };

  const groupedRecipes = recipes.reduce((acc, recipe) => {
    if (!acc[recipe.date]) acc[recipe.date] = [];
    acc[recipe.date].push(recipe);
    return acc;
  }, {} as Record<string, PlannedRecipe[]>);

  const sortedDates = Object.keys(groupedRecipes).sort();

  return (
    <div className="p-4 max-w-3xl mx-auto pb-24">
      <OpenedItemsModal
        isOpen={showOpenedModal}
        items={openedItems}
        onConfirm={handleConfirmOpened}
        onCancel={() => {
          setShowOpenedModal(false);
          if (pendingCookId) performCook(pendingCookId, []);
        }}
      />
      <header className="mb-8 pt-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold tracking-widest text-gray-900">{t('calendar.title')}</h1>
          <button
            onClick={() => navigate('/free-cook')}
            className="bg-emerald-100 text-emerald-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-emerald-200 transition-colors"
          >
            <Camera size={16} />
            {t('calendar.freeCooking')}
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-emerald-600" size={48} />
        </div>
      ) : sortedDates.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-[40px] border-2 border-dashed border-gray-100">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CalendarIcon className="text-gray-200" size={40} />
          </div>
          <p className="text-gray-500 font-bold text-lg mb-1">{t('calendar.emptyTitle')}</p>
          <p className="text-gray-400 text-sm">{t('calendar.emptySubtitle')}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map(date => (
            <div key={date} className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2">
                {new Date(date).toLocaleDateString(dateLocale, {
                  weekday: t('calendar.dateFormat.weekday') as 'long' | 'short' | 'narrow',
                  year: t('calendar.dateFormat.year') as 'numeric' | '2-digit',
                  month: t('calendar.dateFormat.month') as 'long' | 'short' | 'narrow' | 'numeric' | '2-digit',
                  day: t('calendar.dateFormat.day') as 'numeric' | '2-digit'
                })}
              </h2>
              <div className="space-y-4">
                {groupedRecipes[date].map(recipe => (
                  <div key={recipe.id} className={`bg-white rounded-3xl shadow-sm border ${recipe.cooked ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-100'} overflow-hidden`}>
                    <div className="p-5 flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => setExpandedId(expandedId === recipe.id ? null : recipe.id)}
                        >
                          <h3 className={`font-bold text-lg ${recipe.cooked ? 'text-emerald-800 line-through opacity-70' : 'text-gray-900'}`}>
                            {recipe.title}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{recipe.description}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-4 shrink-0">
                          {editingDateId === recipe.id ? (
                            <div className="flex items-center gap-1">
                              <input 
                                type="date" 
                                value={editDateValue} 
                                onChange={(e) => setEditDateValue(e.target.value)}
                                className="border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:border-emerald-500"
                              />
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleUpdateDate(recipe.id); }}
                                className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                              >
                                <CheckCircle2 size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setEditingDateId(recipe.id); 
                                setEditDateValue(recipe.date); 
                              }}
                              disabled={recipe.cooked}
                              className="p-2 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-colors disabled:opacity-50"
                            >
                              <Edit2 size={18} />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(recipe.id); }}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1">
                          <Users size={16} className="text-gray-400 ml-2" />
                          <input
                            type="number"
                            min="1"
                            value={recipe.portions}
                            onChange={(e) => updatePortions(recipe.id, parseInt(e.target.value) || 1)}
                            disabled={recipe.cooked}
                            className="w-12 bg-transparent text-center font-bold text-gray-700 outline-none"
                          />
                        </div>

                        {!recipe.cooked ? (
                          <button
                            onClick={() => handleCook(recipe.id)}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm"
                          >
                            <CheckCircle2 size={18} />
                            <span>{t('calendar.cookAndDeduct')}</span>
                          </button>
                        ) : (
                          <span className="text-emerald-600 font-bold flex items-center gap-1 px-4 py-2">
                            <CheckCircle2 size={18} /> {t('calendar.cooked')}
                          </span>
                        )}
                      </div>
                    </div>

                    {expandedId === recipe.id && (
                      <div className="p-5 border-t border-gray-100 bg-gray-50/50">
                        <RecipeCard
                          recipe={recipe}
                          onCook={() => {}}
                          onBring={() => {}}
                          compact
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
