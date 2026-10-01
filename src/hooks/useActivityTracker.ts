import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'twende_duka_activity';

interface ActivityState {
  recentlyViewedProductIds: string[];
  recentlyViewedShopIds: string[];
  recentSearches: string[];
}

const MAX_HISTORY = 10;

const defaultState: ActivityState = {
  recentlyViewedProductIds: [],
  recentlyViewedShopIds: [],
  recentSearches: [],
};

export const useActivityTracker = () => {
  const [activity, setActivity] = useState<ActivityState>(defaultState);

  // Load from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setActivity(JSON.parse(stored));
      }
    } catch (error) {
      console.warn("Failed to load activity from localStorage", error);
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activity));
    } catch (error) {
      console.warn("Failed to save activity to localStorage", error);
    }
  }, [activity]);

  const trackProductView = useCallback((productId: string) => {
    setActivity(prev => {
      const updated = [productId, ...prev.recentlyViewedProductIds.filter(id => id !== productId)].slice(0, MAX_HISTORY);
      return { ...prev, recentlyViewedProductIds: updated };
    });
  }, []);

  const trackShopView = useCallback((shopId: string) => {
    setActivity(prev => {
      const updated = [shopId, ...prev.recentlyViewedShopIds.filter(id => id !== shopId)].slice(0, MAX_HISTORY);
      return { ...prev, recentlyViewedShopIds: updated };
    });
  }, []);

  const trackSearch = useCallback((query: string) => {
    if (!query.trim()) return;
    setActivity(prev => {
      const updated = [query, ...prev.recentSearches.filter(q => q.toLowerCase() !== query.toLowerCase())].slice(0, MAX_HISTORY);
      return { ...prev, recentSearches: updated };
    });
  }, []);

  const clearActivity = useCallback(() => {
    setActivity(defaultState);
  }, []);

  return {
    activity,
    trackProductView,
    trackShopView,
    trackSearch,
    clearActivity
  };
};
