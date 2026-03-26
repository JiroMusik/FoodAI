import { useState, useEffect } from 'react';
import { AlertTriangle, PackageOpen, Calendar as CalendarIcon, Loader2, Settings, Sparkles, ExternalLink } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import RecipeCard from '../components/RecipeCard';
import { InventoryItem, PlannedRecipe } from '../types.ts';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface FeedItem {
  title: string;
  link: string;
  image: string | null;
  snippet: string;
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    expiringSoon: InventoryItem[];
    openedItems: InventoryItem[];
    todaysRecipes: PlannedRecipe[];
    totalValue: number;
    lowStockCount: number;
  } | null>(null);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
    fetchFeed();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      toast.error(t('dashboard.errorLoadingDashboard'));
    } finally {
      setLoading(false);
    }
  };

  const fetchFeed = async () => {
    try {
      const res = await fetch(`/api/feed/inspiration?lang=${i18n.language}`);
      if (res.ok) {
        const items = await res.json();
        setFeedItems(items);
      }
    } catch (e) {}
  };

  const handleImportInspiration = async (url: string) => {
    try {
      // Show loading toast since we don't have a loading state specifically for importing here
      const toastId = toast.loading('Rezept wird importiert...');
      const res = await fetch('/api/recipes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (!res.ok) throw new Error('Import failed');
      const recipe = await res.json();
      
      // Save it as the current recipe and switch mode, then navigate
      localStorage.setItem('currentRecipe', JSON.stringify(recipe));
      localStorage.setItem('recipeMode', 'single');
      toast.success('Rezept erfolgreich importiert', { id: toastId });
      navigate('/recipes');
    } catch (e) {
      toast.error(t('recipes.importError'));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 pb-24">
      <header className="flex justify-between items-center mb-4 pt-4 shrink-0 max-w-7xl mx-auto w-full">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-widest text-gray-900">{t('dashboard.title')}</h1>
          <div className="flex gap-2 mt-1">
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-tighter">
              {data?.totalValue.toLocaleString(i18n.language === 'de' ? 'de-DE' : 'en-US', { style: 'currency', currency: 'EUR' })} {t('dashboard.stockValue')}
            </span>
          </div>
        </div>
        <button onClick={() => navigate('/settings')} className="p-2 text-gray-500 hover:text-gray-900 bg-gray-100 rounded-full">
          <Settings size={20} />
        </button>
      </header>

      {/* 3-column layout: Feed | Main Content | empty or future widget */}
      <div className="flex flex-1 gap-4 min-h-0 max-w-7xl mx-auto w-full">

        {/* Left: RSS Feed Inspiration */}
        <aside className="flex flex-col w-72 shrink-0 min-h-0 max-lg:hidden">
          <div className="flex items-center gap-2 mb-3 text-emerald-700 font-semibold">
            <Sparkles size={18} />
            <h2 className="text-sm uppercase tracking-widest">{t('dashboard.inspiration')}</h2>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {feedItems.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-8">{t('common.loading')}</div>
            ) : (
              feedItems.filter(item => item.image).slice(0, 3).map((item, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:border-emerald-200 hover:shadow-md transition-all group flex flex-col">
                  {item.image && (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="block h-28 overflow-hidden relative">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                    </a>
                  )}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <a href={item.link} target="_blank" rel="noopener noreferrer">
                        <h3 className="text-sm font-bold text-gray-800 leading-tight line-clamp-2 group-hover:text-emerald-600 transition-colors mb-1">{item.title}</h3>
                      </a>
                      {item.snippet && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.snippet}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1 text-[10px] text-gray-500 font-bold hover:text-gray-700 bg-gray-50 hover:bg-gray-100 py-1.5 rounded-lg transition-colors">
                        <ExternalLink size={12} /> {t('dashboard.viewRecipe')}
                      </a>
                      <button 
                        onClick={() => handleImportInspiration(item.link)}
                        className="flex-1 flex items-center justify-center gap-1 text-[10px] text-emerald-600 font-bold hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 py-1.5 rounded-lg transition-colors"
                      >
                        Importieren
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Center: Main dashboard content */}
        <div className="flex flex-col flex-1 min-h-0 min-w-0">
          {/* Today's Meals */}
          <section className="shrink-0 mb-4">
            <div className="flex items-center gap-2 mb-2 text-emerald-700 font-semibold">
              <CalendarIcon size={20} />
              <h2>{t('dashboard.todayPlanned')}</h2>
            </div>
            {data?.todaysRecipes.length === 0 ? (
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center text-sm text-gray-500">
                {t('dashboard.nothingPlanned')}{' '}
                <Link to="/calendar" className="text-emerald-600 font-medium">{t('dashboard.toCalendar')}</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data?.todaysRecipes.map((recipe) => (
                  <div key={recipe.id} onClick={() => navigate('/calendar')} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-emerald-200 transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">{recipe.title}</h3>
                      {recipe.cooked ? (
                        <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md uppercase tracking-widest">{t('calendar.cooked')}</span>
                      ) : (
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md uppercase tracking-widest">{t('common.portions')}: {recipe.portions}</span>
                      )}
                    </div>
                    {recipe.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">{recipe.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Two columns: Expiring + Opened */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
            <section className="bg-orange-50 border border-orange-100 rounded-2xl p-4 shadow-sm flex flex-col min-h-0">
              <div className="flex items-center gap-2 mb-3 text-orange-700 font-semibold shrink-0">
                <AlertTriangle size={18} />
                <h2>{t('dashboard.expiringSoonTitle', { count: data?.expiringSoon.length })}</h2>
              </div>
              {data?.expiringSoon.length === 0 ? (
                <p className="text-sm text-orange-600/70">{t('dashboard.allGood')}</p>
              ) : (
                <ul className="space-y-2 overflow-y-auto flex-1 pr-1">
                  {data?.expiringSoon.map((item) => (
                    <li key={item.id} className="text-sm flex justify-between bg-white/60 p-2 rounded-xl">
                      <span className="font-medium text-gray-800 truncate pr-2">{item.name}</span>
                      <span className="text-orange-600 whitespace-nowrap">{item.expiry_date}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-blue-50 border border-blue-100 rounded-2xl p-4 shadow-sm flex flex-col min-h-0">
              <div className="flex items-center gap-2 mb-3 text-blue-700 font-semibold shrink-0">
                <PackageOpen size={18} />
                <h2>{t('dashboard.openedPackagesTitle', { count: data?.openedItems.length })}</h2>
              </div>
              {data?.openedItems.length === 0 ? (
                <p className="text-sm text-blue-600/70">{t('dashboard.noOpenedPackages')}</p>
              ) : (
                <ul className="space-y-2 overflow-y-auto flex-1 pr-1">
                  {data?.openedItems.map((item) => (
                    <li key={item.id} className="text-sm flex justify-between bg-white/60 p-2 rounded-xl">
                      <span className="font-medium text-gray-800 truncate pr-2">{item.name}</span>
                      <span className="text-gray-500 whitespace-nowrap">{item.quantity} {item.unit}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>

      </div>
    </div>
  );
}
