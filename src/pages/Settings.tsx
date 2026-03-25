import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Save, Cpu, Key, Globe, Languages, Palette, Upload, Sun, Moon, Monitor } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

const INITIAL_PROVIDERS = [
  { id: 'gemini', name: 'Google Gemini', models: ['gemini-3-flash-preview', 'gemini-flash-latest', 'gemini-3.1-pro-preview'] },
  { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini'] },
  { id: 'anthropic', name: 'Anthropic Claude', models: ['claude-3-5-sonnet-latest', 'claude-3-haiku-20240307'] },
  { id: 'deepseek', name: 'DeepSeek', models: ['deepseek-chat', 'deepseek-reasoner'] },
  { id: 'moonshot', name: 'Moonshot (Kimi)', models: ['moonshot-v1-8k', 'moonshot-v1-32k'] },
  { id: 'ollama', name: 'Ollama (Local)', models: ['llama3', 'mistral', 'llava'] },
];

export default function Settings() {
  const { t, i18n } = useTranslation();
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
  const [theme, setTheme] = useState(() => localStorage.getItem('foodai-theme') || 'light');
  const [customCss, setCustomCss] = useState(() => localStorage.getItem('foodai-custom-css') || '');

  const getSystemTheme = () => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  const applyTheme = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('foodai-theme', newTheme);
    document.documentElement.classList.remove('light', 'dark');

    const effectiveTheme = newTheme === 'auto' ? getSystemTheme() : newTheme;
    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }

    // Apply/remove custom CSS
    let styleEl = document.getElementById('foodai-custom-css');
    if (newTheme === 'custom' && customCss) {
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'foodai-custom-css';
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = customCss;
    } else if (styleEl) {
      styleEl.remove();
    }
  };

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (theme === 'auto') applyTheme('auto'); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const handleCustomCssUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const css = ev.target?.result as string;
      setCustomCss(css);
      localStorage.setItem('foodai-custom-css', css);
      if (theme === 'custom') applyTheme('custom');
      toast.success(t('settings.customCssLoaded'));
    };
    reader.readAsText(file);
  };

  useEffect(() => { applyTheme(theme); }, []);

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
        toast.success(t('settings.latestModelsLoaded'), { icon: '🤖' });
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
      toast.success(t('settings.settingsSaved'));
      // Re-fetch to ensure UI is in sync
      fetchSettings();
    } catch (error) {
      toast.error(t('common.errorSaving'));
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  if (loading) return null;

  const currentProvider = providers.find(p => p.id === settings.ai_provider);

  return (
    <div className="p-4 max-w-3xl mx-auto pb-24">
      <header className="mb-8 pt-4">
        <h1 className="text-2xl font-bold tracking-widest text-gray-900">{t('settings.title')}</h1>
      </header>

      <div className="space-y-6">
        {/* Language Selection */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-6 flex items-center">
            <span className="bg-blue-100 text-blue-600 p-2 rounded-lg mr-3">
              <Languages size={20} />
            </span>
            {t('settings.language')}
          </h2>

          <div className="flex gap-3">
            {[
              { code: 'de', label: t('settings.languageDE') },
              { code: 'en', label: t('settings.languageEN') },
              { code: 'es', label: t('settings.languageES') },
            ].map(lang => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                  i18n.language === lang.code
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100'
                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 dark:bg-gray-900 dark:border-gray-800">
          <h2 className="text-lg font-semibold mb-6 flex items-center">
            <span className="bg-purple-100 text-purple-600 p-2 rounded-lg mr-3">
              <Palette size={20} />
            </span>
            {t('settings.theme')}
          </h2>

          <div className="flex gap-3 mb-4">
            {[
              { id: 'light', icon: Sun, label: t('settings.themeLight') },
              { id: 'dark', icon: Moon, label: t('settings.themeDark') },
              { id: 'auto', icon: Monitor, label: t('settings.themeAuto') },
              { id: 'custom', icon: Palette, label: t('settings.themeCustom') },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => applyTheme(opt.id)}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  theme === opt.id
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-100'
                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <opt.icon size={16} />
                {opt.label}
              </button>
            ))}
          </div>

          {theme === 'custom' && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                <Upload size={18} className="text-gray-400" />
                <span className="text-sm text-gray-600 font-medium">{t('settings.uploadCss')}</span>
                <input type="file" accept=".css" onChange={handleCustomCssUpload} className="hidden" />
              </label>
              {customCss && (
                <p className="text-xs text-gray-400">{t('settings.customCssActive', { size: customCss.length })}</p>
              )}
            </div>
          )}
        </div>

        {/* AI Configuration */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-6 flex items-center">
            <span className="bg-emerald-100 text-emerald-600 p-2 rounded-lg mr-3">
              <Cpu size={20} />
            </span>
            {t('settings.aiConfiguration')}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.provider')}</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.mainModel')}</label>
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
                  placeholder={t('scanner.ollamaModelPlaceholder')}
                  value={settings.ai_model}
                  onChange={e => setSettings({...settings, ai_model: e.target.value})}
                  className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.advisorModel')}</label>
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
              <p className="text-xs text-gray-500 mt-1">{t('settings.advisorModelHint')}</p>
            </div>

            {settings.ai_provider !== 'ollama' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Key size={14} className="mr-1" /> {t('settings.apiKey')}
                </label>
                <input
                  type="password"
                  value={settings.ai_api_key}
                  onChange={e => setSettings({...settings, ai_api_key: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder={settings.ai_provider === 'gemini' ? t('settings.apiKeyPlaceholderDefault') : t('settings.apiKeyPlaceholderCustom')}
                />
              </div>
            )}

            {settings.ai_provider === 'ollama' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Globe size={14} className="mr-1" /> {t('settings.ollamaUrl')}
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
            {t('settings.bringIntegration')}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.email')}</label>
              <input
                type="email"
                value={settings.bring_email}
                onChange={e => setSettings({...settings, bring_email: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder={t('settings.emailPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.password')}</label>
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
          <span>{t('settings.saveAllSettings')}</span>
        </button>
      </div>
    </div>
  );
}
