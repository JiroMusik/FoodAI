import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Save, Cpu, Key, Globe } from 'lucide-react';
import React from 'react';

const INITIAL_PROVIDERS = [
  { id: 'gemini', name: 'Google Gemini', models: ['gemini-3-flash-preview', 'gemini-flash-latest', 'gemini-3.1-pro-preview'] },
  { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini'] },
  { id: 'anthropic', name: 'Anthropic Claude', models: ['claude-3-5-sonnet-latest', 'claude-3-haiku-20240307'] },
  { id: 'deepseek', name: 'DeepSeek', models: ['deepseek-chat', 'deepseek-reasoner'] },
  { id: 'moonshot', name: 'Moonshot (Kimi)', models: ['moonshot-v1-8k', 'moonshot-v1-32k'] },
  { id: 'ollama', name: 'Ollama (Local)', models: ['llama3', 'mistral', 'llava'] },
];

export default function Settings() {
  const [providers, setProviders] = useState(INITIAL_PROVIDERS);
  const [settings, setSettings] = useState({
    bring_email: '',
    bring_password: '',
    ai_provider: 'gemini',
    ai_model: 'gemini-3-flash-preview',
    advisor_model: 'gemini-3-flash-preview',
    ai_api_key: '',
    ollama_url: 'http://localhost:11434'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/settings/models');
      if (res.ok) {
        const data = await res.json();
        setProviders(prev => prev.map(p => {
          if (data[p.id]) {
            return { ...p, models: data[p.id] };
          }
          return p;
        }));
        toast.success('Neueste KI-Modelle geladen', { icon: '🤖' });
      }
    } catch (error) {
      console.error('Failed to fetch models');
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Einstellungen gespeichert');
      // Re-fetch to ensure UI is in sync
      fetchSettings();
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  if (loading) return null;

  const currentProvider = providers.find(p => p.id === settings.ai_provider);

  return (
    <div className="p-4 max-w-3xl mx-auto pb-24">
      <header className="mb-8 pt-4">
        <h1 className="text-2xl font-bold tracking-tight">Einstellungen</h1>
      </header>

      <div className="space-y-6">
        {/* AI Configuration */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-6 flex items-center">
            <span className="bg-emerald-100 text-emerald-600 p-2 rounded-lg mr-3">
              <Cpu size={20} />
            </span>
            KI Konfiguration
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Anbieter</label>
              <select
                value={settings.ai_provider}
                onChange={e => {
                  const provider = providers.find(p => p.id === e.target.value);
                  setSettings({
                    ...settings, 
                    ai_provider: e.target.value,
                    ai_model: provider?.models[0] || ''
                  });
                }}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              >
                {providers.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modell (Haupt-KI)</label>
              <select
                value={settings.ai_model}
                onChange={e => setSettings({...settings, ai_model: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              >
                {currentProvider?.models.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
                {settings.ai_provider === 'ollama' && <option value={settings.ai_model}>Custom: {settings.ai_model}</option>}
              </select>
              {settings.ai_provider === 'ollama' && (
                <input
                  type="text"
                  placeholder="Ollama Modell Name (z.B. llama3)"
                  value={settings.ai_model}
                  onChange={e => setSettings({...settings, ai_model: e.target.value})}
                  className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modell (Mengen-Berater / Günstig)</label>
              <select
                value={settings.advisor_model}
                onChange={e => setSettings({...settings, advisor_model: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              >
                {currentProvider?.models.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
                {settings.ai_provider === 'ollama' && <option value={settings.advisor_model}>Custom: {settings.advisor_model}</option>}
              </select>
              <p className="text-xs text-gray-500 mt-1">Wird für einfache Aufgaben wie Mengen-Schätzungen verwendet, um Kosten zu sparen.</p>
            </div>

            {settings.ai_provider !== 'ollama' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Key size={14} className="mr-1" /> API Key
                </label>
                <input
                  type="password"
                  value={settings.ai_api_key}
                  onChange={e => setSettings({...settings, ai_api_key: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder={settings.ai_provider === 'gemini' ? 'Optional (Standard Key wird genutzt)' : 'Dein API Key'}
                />
              </div>
            )}

            {settings.ai_provider === 'ollama' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Globe size={14} className="mr-1" /> Ollama URL
                </label>
                <input
                  type="text"
                  value={settings.ollama_url}
                  onChange={e => setSettings({...settings, ollama_url: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="http://localhost:11434"
                />
              </div>
            )}
          </div>
        </div>

        {/* Bring! Integration */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-6 flex items-center">
            <span className="bg-red-100 text-red-600 p-2 rounded-lg mr-3">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
            </span>
            Bring! Integration
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
              <input
                type="email"
                value={settings.bring_email}
                onChange={e => setSettings({...settings, bring_email: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="deine@email.de"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passwort</label>
              <input
                type="password"
                value={settings.bring_password}
                onChange={e => setSettings({...settings, bring_password: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-gray-900 text-white py-4 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:bg-gray-800 transition-colors shadow-lg"
        >
          <Save size={20} />
          <span>Alle Einstellungen speichern</span>
        </button>
      </div>
    </div>
  );
}

