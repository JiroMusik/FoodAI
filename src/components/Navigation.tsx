import { NavLink } from 'react-router-dom';
import { List, ScanLine, CalendarDays, Home, ShoppingCart, ChefHat } from 'lucide-react';

export default function Navigation() {
  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Übersicht' },
    { path: '/inventory', icon: List, label: 'Vorrat' },
    { path: '/scanner', icon: ScanLine, label: 'Scan' },
    { path: '/recipes', icon: ChefHat, label: 'Rezepte' },
    { path: '/calendar', icon: CalendarDays, label: 'Kalender' },
    { path: '/shopping-list', icon: ShoppingCart, label: 'Einkauf' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-900'
              }`
            }
          >
            <Icon size={24} />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
