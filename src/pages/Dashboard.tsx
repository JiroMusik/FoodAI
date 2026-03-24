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
        <h1 className="text-2xl font-bold tracking-widest text-gray-900">{t('dashboard.title')}</h1>
        <button onClick={() => navigate('/settings')} className="p-2 text-gray-500 hover:text-gray-900 bg-gray-100 rounded-full">
          <Settings size={20} />
        </button>
      </header>

      {/* 3-column layout: Feed | Main Content | empty or future widget */}
      <div className="flex flex-1 gap-4 min-h-0 max-w-7xl mx-auto w-full">

        {/* Left: RSS Feed Inspiration */}
        <aside className="hidden lg:flex flex-col w-72 shrink-0 min-h-0">
          <div className="flex items-center gap-2 mb-3 text-emerald-700 font-semibold">
            <Sparkles size={18} />
            <h2 className="text-sm uppercase tracking-widest">{t('dashboard.inspiration')}</h2>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {feedItems.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-8">{t('common.loading')}</div>
            ) : (
              feedItems.map((item, idx) => (
                <a key={idx} href={item.link} target="_blank" rel="noopener noreferrer"
                  className="block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:border-emerald-200 hover:shadow-md transition-all group">
                  {item.image && (
                    <div className="h-28 overflow-hidden">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="text-sm font-bold text-gray-800 leading-tight line-clamp-2 group-hover:text-emerald-600 transition-colors">{item.title}</h3>
                    {item.snippet && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.snippet}</p>
                    )}
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-emerald-500 font-bold">
                      <ExternalLink size={10} />
                      <span>{t('dashboard.viewRecipe')}</span>
                    </div>
                  </div>
                </a>
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
              <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm text-center text-sm text-gray-500">
                {t('dashboard.nothingPlanned')}{' '}
                <Link to="/calendar" className="text-emerald-600 font-medium">{t('dashboard.toCalendar')}</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data?.todaysRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onCook={() => navigate('/calendar')}
                    onBring={() => navigate('/shopping-list')}
                    compact
                  />
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

        {/* Mobile: Feed as horizontal scroll below main content */}
        <div className="lg:hidden fixed bottom-16 left-0 right-0 bg-white/90 backdrop-blur border-t border-gray-100 px-4 py-2" style={{display: feedItems.length > 0 ? 'block' : 'none'}}>
          <div className="flex gap-3 overflow-x-auto snap-x pb-1">
            {feedItems.slice(0, 4).map((item, idx) => (
              <a key={idx} href={item.link} target="_blank" rel="noopener noreferrer"
                className="flex-shrink-0 w-40 snap-start bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {item.image && <img src={item.image} alt={item.title} className="w-full h-20 object-cover" />}
                <p className="p-2 text-xs font-bold text-gray-800 line-clamp-2">{item.title}</p>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
