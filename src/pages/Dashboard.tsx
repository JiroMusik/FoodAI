import { useState, useEffect } from 'react';
import { AlertTriangle, PackageOpen, Calendar as CalendarIcon, Loader2, Settings } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import RecipeCard from '../components/RecipeCard';
import { InventoryItem, PlannedRecipe } from '../types.ts';
import { toast } from 'react-hot-toast';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    expiringSoon: InventoryItem[];
    openedItems: InventoryItem[];
    todaysRecipes: PlannedRecipe[];
  } | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      toast.error('Fehler beim Laden des Dashboards');
    } finally {
      setLoading(false);
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
    <div className="p-4 max-w-3xl mx-auto pb-24 space-y-6">
      <header className="flex justify-between items-center mb-6 pt-4">
        <h1 className="text-2xl font-bold tracking-tight">Übersicht</h1>
        <button onClick={() => navigate('/settings')} className="p-2 text-gray-500 hover:text-gray-900 bg-gray-100 rounded-full">
          <Settings size={20} />
        </button>
      </header>

      {/* Today's Meals */}
      <section>
        <div className="flex items-center gap-2 mb-3 text-emerald-700 font-semibold">
          <CalendarIcon size={20} />
          <h2>Heute Geplant</h2>
        </div>
        {data?.todaysRecipes.length === 0 ? (
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center text-sm text-gray-500">
            Nichts für heute geplant.{' '}
            <Link to="/calendar" className="text-emerald-600 font-medium">Zum Kalender</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {data?.todaysRecipes.map((recipe) => (
              <RecipeCard 
                key={recipe.id} 
                recipe={recipe} 
                onCook={() => navigate('/calendar')}
                onBring={() => navigate('/shopping-list')}
              />
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Expiring Soon */}
        <section className="bg-orange-50 border border-orange-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3 text-orange-700 font-semibold">
            <AlertTriangle size={18} />
            <h2>Läuft bald ab ({data?.expiringSoon.length})</h2>
          </div>
          {data?.expiringSoon.length === 0 ? (
            <p className="text-sm text-orange-600/70">Alles im grünen Bereich!</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto pr-2">
              {data?.expiringSoon.map((item) => (
                <li key={item.id} className="text-sm flex justify-between bg-white/60 p-2 rounded-xl">
                  <span className="font-medium text-gray-800 truncate pr-2">{item.name}</span>
                  <span className="text-orange-600 whitespace-nowrap">{item.expiry_date}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Opened Packages */}
        <section className="bg-blue-50 border border-blue-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3 text-blue-700 font-semibold">
            <PackageOpen size={18} />
            <h2>Geöffnete Packungen ({data?.openedItems.length})</h2>
          </div>
          {data?.openedItems.length === 0 ? (
            <p className="text-sm text-blue-600/70">Keine offenen Packungen.</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto pr-2">
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
  );
}
