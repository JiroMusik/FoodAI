import { useState, useCallback } from 'react';
import { settingsApi } from '../api/client';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export function useSettings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await settingsApi.get();
      setSettings(data);
      return data;
    } catch (error) {
      toast.error(t('settings.errorLoadingSettings'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const updateSettings = async (updates: any) => {
    try {
      await settingsApi.updateBulk(updates);
      setSettings((prev: any) => ({ ...prev, ...updates }));
      toast.success(t('common.updated'));
    } catch (error) {
      toast.error(t('common.errorSaving'));
    }
  };

  return {
    settings,
    loading,
    fetchSettings,
    updateSettings
  };
}
