export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const inventoryApi = {
  getAll: () => apiFetch<any[]>('/api/inventory'),
  add: (item: any) => apiFetch<any>('/api/inventory', { method: 'POST', body: JSON.stringify(item) }),
  update: (id: number, item: any) => apiFetch<any>(`/api/inventory/${id}`, { method: 'PUT', body: JSON.stringify(item) }),
  delete: (id: number) => apiFetch<any>(`/api/inventory/${id}`, { method: 'DELETE' }),
  open: (id: number) => apiFetch<any>(`/api/inventory/${id}/open`, { method: 'POST' }),
  bulkDelete: (ids: number[]) => apiFetch<any>('/api/inventory/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  bulkUpdate: (ids: number[], updates: any) => apiFetch<any>('/api/inventory/bulk-update', { method: 'POST', body: JSON.stringify({ ids, updates }) }),
};

export const calendarApi = {
  get: () => apiFetch<any[]>('/api/calendar'),
  add: (item: any) => apiFetch<any>('/api/calendar', { method: 'POST', body: JSON.stringify(item) }),
  addWeek: (data: any) => apiFetch<any>('/api/calendar/week', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch<any>(`/api/calendar/${id}`, { method: 'DELETE' }),
  updateDate: (id: number, date: string) => apiFetch<any>(`/api/calendar/${id}/date`, { method: 'PUT', body: JSON.stringify({ date }) }),
  updatePortions: (id: number, portions: number) => apiFetch<any>(`/api/calendar/${id}/portions`, { method: 'PUT', body: JSON.stringify({ portions }) }),
  cook: (id: number, openedUpdates: any[]) => apiFetch<any>(`/api/calendar/${id}/cook`, { method: 'PUT', body: JSON.stringify({ openedUpdates }) }),
};

export const recipeApi = {
  generate: (data: any) => apiFetch<any>('/api/recipes/generate', { method: 'POST', body: JSON.stringify(data) }),
  generateWeekly: (data: any) => apiFetch<any>('/api/recipes/weekly', { method: 'POST', body: JSON.stringify(data) }),
  getWeekly: () => apiFetch<any>('/api/recipes/weekly'),
  import: (url: string) => apiFetch<any>('/api/recipes/import', { method: 'POST', body: JSON.stringify({ url }) }),
  calculateMissing: (data: any) => apiFetch<any>('/api/recipes/missing-ingredients', { method: 'POST', body: JSON.stringify(data) }),
  getFavorites: () => apiFetch<any[]>('/api/recipes/favorites'),
  addFavorite: (recipe: any) => apiFetch<any>('/api/recipes/favorites', { method: 'POST', body: JSON.stringify(recipe) }),
  deleteFavorite: (id: number) => apiFetch<any>(`/api/recipes/favorites/${id}`, { method: 'DELETE' }),
};

export const settingsApi = {
  get: () => apiFetch<any>('/api/settings'),
  updateBulk: (settings: any) => apiFetch<any>('/api/settings/bulk', { method: 'POST', body: JSON.stringify({ settings }) }),
  getModels: () => apiFetch<any>('/api/settings/models'),
};

export const dashboardApi = {
  get: () => apiFetch<any>('/api/dashboard'),
};

export const scannerApi = {
  scan: (imageBase64: string) => apiFetch<any>('/api/scan', { method: 'POST', body: JSON.stringify({ imageBase64 }) }),
  scanMhd: (imageBase64: string) => apiFetch<any>('/api/scan/mhd', { method: 'POST', body: JSON.stringify({ imageBase64 }) }),
  lookupBarcode: (barcode: string) => apiFetch<any>(`/api/barcode/lookup/${barcode}`),
};
