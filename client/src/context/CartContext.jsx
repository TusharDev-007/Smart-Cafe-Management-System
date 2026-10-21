import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "cafe-cart";

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // storage unavailable or corrupted: start with an empty cart
  }
  return { tableNumber: null, items: [] };
}

export function CartProvider({ children }) {
  const [state, setState] = useState(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  // Scanning a different table's QR starts a fresh cart
  const setTable = useCallback((n) => {
    setState((prev) => (prev.tableNumber === n ? prev : { tableNumber: n, items: [] }));
  }, []);

  const add = useCallback((m) => {
    setState((prev) => {
      const existing = prev.items.find((i) => i.menuItemId === m.id);
      const items = existing
        ? prev.items.map((i) =>
            i.menuItemId === m.id ? { ...i, quantity: Math.min(i.quantity + 1, 20) } : i
          )
        : [...prev.items, { menuItemId: m.id, name: m.name, pricePaise: m.pricePaise, quantity: 1 }];
      return { ...prev, items };
    });
  }, []);

  const decrease = useCallback((id) => {
    setState((prev) => ({
      ...prev,
      items: prev.items
        .map((i) => (i.menuItemId === id ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0),
    }));
  }, []);

  const clear = useCallback(() => setState((prev) => ({ ...prev, items: [] })), []);

  const value = useMemo(() => {
    const count = state.items.reduce((s, i) => s + i.quantity, 0);
    const totalPaise = state.items.reduce((s, i) => s + i.quantity * i.pricePaise, 0);
    return { ...state, count, totalPaise, setTable, add, decrease, clear };
  }, [state, setTable, add, decrease, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}