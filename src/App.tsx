/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Scanner from './pages/Scanner';
import Recipes from './pages/Recipes';
import Calendar from './pages/Calendar';
import FreeCook from './pages/FreeCook';
import Settings from './pages/Settings';
import ShoppingList from './pages/ShoppingList';
import Favorites from './pages/Favorites';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans">
        <main className="flex-1 overflow-y-auto pb-20">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/scanner" element={<Scanner />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/free-cook" element={<FreeCook />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/shopping-list" element={<ShoppingList />} />
            <Route path="/favorites" element={<Favorites />} />
          </Routes>
        </main>
        <Navigation />
        <Toaster position="top-center" />
      </div>
    </BrowserRouter>
  );
}
