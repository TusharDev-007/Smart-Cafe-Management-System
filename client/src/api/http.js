const TOKEN_KEY = "cafe-token";

export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // storage unavailable
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // storage unavailable
    }
  },
};

async function request(path, options = {}) {
  const token = tokenStore.get();
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.error || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data;
}

// Customer
export const getMenu = () => request("/menu");
export const trackOrder = (token) => request(`/orders/track/${token}`);
export const createOrder = (body) =>
  request("/orders", { method: "POST", body: JSON.stringify(body) });

export const getRecommendations = (menuItemIds) =>
  request("/recommendations", {
    method: "POST",
    body: JSON.stringify({ items: menuItemIds.map((menuItemId) => ({ menuItemId })) }),
  });

// Staff
export const loginRequest = (email, password) =>
  request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
export const getActiveOrders = () => request("/orders/active");
export const updateOrderStatus = (id, status) =>
  request(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });

export const getSummary = () => request("/analytics/summary");
export const getHourly = (days) => request(`/analytics/orders-by-hour?days=${days}`);
export const getHeatmap = (days) => request(`/analytics/heatmap?days=${days}`);
export const getTopItems = (days) => request(`/analytics/top-items?days=${days}`);
export const getTables = () => request("/tables");
export const addTable = () => request("/tables", { method: "POST" });

export const getAdminMenu = () => request("/admin/menu");
export const createItem = (body) =>
  request("/admin/menu/items", { method: "POST", body: JSON.stringify(body) });
export const updateItem = (id, body) =>
  request(`/admin/menu/items/${id}`, { method: "PATCH", body: JSON.stringify(body) });
export const deleteItem = (id) => request(`/admin/menu/items/${id}`, { method: "DELETE" });
export const createCategory = (name) =>
  request("/admin/menu/categories", { method: "POST", body: JSON.stringify({ name }) });
export const updateCategory = (id, body) =>
  request(`/admin/menu/categories/${id}`, { method: "PATCH", body: JSON.stringify(body) });
export const deleteCategory = (id) =>
  request(`/admin/menu/categories/${id}`, { method: "DELETE" });