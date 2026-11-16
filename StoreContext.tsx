import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CartSelection } from '@/lib/orders';

export const MAX_LINE_QUANTITY = 10;

const CART_KEY = 'veyra-cart';
const WISHLIST_KEY = 'veyra-wishlist';

export function lineKey(item: Pick<CartSelection, 'slug' | 'size' | 'color'>) {
  return `${item.slug}|${item.size}|${item.color}`;
}

export type StoreContextValue = {
  cart: CartSelection[];
  wishlist: string[];
  cartCount: number;
  wishlistCount: number;
  addToCart: (item: CartSelection) => void;
  setCartQuantity: (key: string, quantity: number) => void;
  removeFromCart: (key: string) => void;
  moveCartItemToWishlist: (key: string) => void;
  clearCart: () => void;
  toggleWishlist: (slug: string) => void;
  isInWishlist: (slug: string) => boolean;
};

export const StoreContext = createContext<StoreContextValue | null>(null);

function readStorage<T>(key: string, isValid: (value: unknown) => value is T, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function isCartSelections(value: unknown): value is CartSelection[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item.slug === 'string' &&
        typeof item.size === 'string' &&
        typeof item.color === 'string' &&
        typeof item.quantity === 'number' &&
        item.quantity > 0,
    )
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function clampQuantity(quantity: number) {
  return Math.min(MAX_LINE_QUANTITY, Math.max(1, Math.floor(quantity)));
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartSelection[]>(() => readStorage(CART_KEY, isCartSelections, []));
  const [wishlist, setWishlist] = useState<string[]>(() => readStorage(WISHLIST_KEY, isStringArray, []));

  useEffect(() => {
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
  }, [wishlist]);

  const addToCart = useCallback((item: CartSelection) => {
    setCart((current) => {
      const key = lineKey(item);
      const existing = current.find((line) => lineKey(line) === key);
      if (!existing) {
        return [...current, { ...item, quantity: clampQuantity(item.quantity) }];
      }
      return current.map((line) =>
        lineKey(line) === key
          ? { ...line, quantity: clampQuantity(line.quantity + item.quantity) }
          : line,
      );
    });
  }, []);

  const setCartQuantity = useCallback((key: string, quantity: number) => {
    setCart((current) =>
      current.map((line) => (lineKey(line) === key ? { ...line, quantity: clampQuantity(quantity) } : line)),
    );
  }, []);

  const removeFromCart = useCallback((key: string) => {
    setCart((current) => current.filter((line) => lineKey(line) !== key));
  }, []);

  const moveCartItemToWishlist = useCallback(
    (key: string) => {
      const line = cart.find((item) => lineKey(item) === key);
      if (!line) return;
      setWishlist((list) => (list.includes(line.slug) ? list : [...list, line.slug]));
      setCart(cart.filter((item) => lineKey(item) !== key));
    },
    [cart],
  );

  const clearCart = useCallback(() => setCart([]), []);

  const toggleWishlist = useCallback((slug: string) => {
    setWishlist((current) =>
      current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug],
    );
  }, []);

  const value = useMemo<StoreContextValue>(
    () => ({
      cart,
      wishlist,
      cartCount: cart.reduce((sum, line) => sum + line.quantity, 0),
      wishlistCount: wishlist.length,
      addToCart,
      setCartQuantity,
      removeFromCart,
      moveCartItemToWishlist,
      clearCart,
      toggleWishlist,
      isInWishlist: (slug: string) => wishlist.includes(slug),
    }),
    [cart, wishlist, addToCart, setCartQuantity, removeFromCart, moveCartItemToWishlist, clearCart, toggleWishlist],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
