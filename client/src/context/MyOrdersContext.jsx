import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { trackOrder } from "../api/http";
import { socket } from "../api/socket";

const STORAGE_KEY = "cafe-my-orders";
const KEEP_MS = 12 * 60 * 60 * 1000; // remember orders on this device for 12 hours
const VISIT_MS = 3 * 60 * 60 * 1000; // orders from the last 3 hours count as "this visit"
const MAX_ENTRIES = 10;

const MyOrdersContext = createContext(null);

function loadEntries() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    const cutoff = Date.now() - KEEP_MS;
    return raw
      .filter((e) => e && typeof e.token === "string" && e.placedAt > cutoff)
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function MyOrdersProvider({ children }) {
  const [entries, setEntries] = useState(loadEntries); // [{ token, placedAt }], newest first
  const [byToken, setByToken] = useState({}); // token -> latest order from the server
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // storage unavailable
    }
  }, [entries]);

  const tokensKey = entries.map((e) => e.token).join(",");

  // Keep every remembered order fresh: join its room, reload on reconnect, apply live updates
  useEffect(() => {
    const tokens = tokensKey ? tokensKey.split(",") : [];
    if (tokens.length === 0) return;

    const forget = (token) => setEntries((prev) => prev.filter((e) => e.token !== token));

    const loadAll = () => {
      tokens.forEach((token) => {
        trackOrder(token)
          .then((o) => setByToken((prev) => ({ ...prev, [token]: o })))
          .catch((e) => {
            if (e.status === 404 || e.status === 400) forget(token);
          });
      });
    };
    const join = () => {
      tokens.forEach((token) => socket.emit("join:order", token));
      loadAll();
    };
    const onUpdated = (o) => {
      if (tokens.includes(o.publicToken)) {
        setByToken((prev) => ({ ...prev, [o.publicToken]: o }));
      }
    };

    if (socket.connected) join();
    socket.on("connect", join);
    socket.on("order:updated", onUpdated);
    return () => {
      socket.off("connect", join);
      socket.off("order:updated", onUpdated);
    };
  }, [tokensKey]);

  const addOrder = useCallback((order) => {
    setEntries((prev) => {
      if (prev.some((e) => e.token === order.publicToken)) return prev;
      return [{ token: order.publicToken, placedAt: Date.now() }, ...prev].slice(0, MAX_ENTRIES);
    });
    setByToken((prev) => ({ ...prev, [order.publicToken]: order }));
  }, []);

  const dismiss = useCallback((token) => {
    setEntries((prev) => prev.filter((e) => e.token !== token));
    setByToken((prev) => {
      const next = { ...prev };
      delete next[token];
      return next;
    });
  }, []);

  // This device's orders for one table, newest first
  const forTable = useCallback(
    (tableNumber) =>
      entries
        .map((e) => byToken[e.token])
        .filter((o) => o && o.table.number === tableNumber),
    [entries, byToken]
  );

  // Menu item ids ordered at this table during the current visit (cancelled orders ignored)
  const visitItemIds = useCallback(
    (tableNumber) => {
      const cutoff = now - VISIT_MS;
      const ids = new Set();
      forTable(tableNumber).forEach((o) => {
        if (o.status !== "CANCELLED" && new Date(o.createdAt).getTime() > cutoff) {
          o.items.forEach((i) => ids.add(i.menuItemId));
        }
      });
      return [...ids].sort((a, b) => a - b);
    },
    [forTable, now]
  );

  const value = useMemo(
    () => ({ addOrder, dismiss, forTable, visitItemIds }),
    [addOrder, dismiss, forTable, visitItemIds]
  );

  return <MyOrdersContext.Provider value={value}>{children}</MyOrdersContext.Provider>;
}

export function useMyOrders() {
  const ctx = useContext(MyOrdersContext);
  if (!ctx) throw new Error("useMyOrders must be used inside MyOrdersProvider");
  return ctx;
}