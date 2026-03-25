import { useState, useEffect, useCallback } from 'react';
import type { Restaurant, MenuItem, MenuItemOption } from '../types/database';
import * as restaurantService from '../services/restaurants';

export const useRestaurants = (zone?: string) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await restaurantService.getRestaurants(zone);
      setRestaurants(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar restaurantes');
    } finally {
      setLoading(false);
    }
  }, [zone]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      fetch();
      return;
    }
    setLoading(true);
    try {
      const data = await restaurantService.searchRestaurants(query);
      setRestaurants(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error en busqueda');
    } finally {
      setLoading(false);
    }
  }, [fetch]);

  return { restaurants, loading, error, refresh: fetch, search };
};

export const useRestaurantMenu = (restaurantId: string) => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);
    Promise.all([
      restaurantService.getMenuItems(restaurantId),
      restaurantService.getMenuCategories(restaurantId),
    ])
      .then(([menuItems, cats]) => {
        setItems(menuItems);
        setCategories(cats);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Error al cargar menu');
      })
      .finally(() => setLoading(false));
  }, [restaurantId]);

  return { items, categories, loading, error };
};

export const useMenuItemOptions = (menuItemId: string) => {
  const [options, setOptions] = useState<MenuItemOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!menuItemId) return;
    restaurantService
      .getMenuItemOptions(menuItemId)
      .then(setOptions)
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, [menuItemId]);

  return { options, loading };
};
