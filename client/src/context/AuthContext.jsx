import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { loginRequest, tokenStore } from "../api/http";
import { socket } from "../api/socket";

const AuthContext = createContext(null);
const USER_KEY = "cafe-user";

function loadUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw && tokenStore.get() ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadUser);

  const login = useCallback(async (email, password) => {
    const data = await loginRequest(email, password);
    tokenStore.set(data.token);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    } catch {
      // ignore
    }
    setUser(data.user);
    socket.disconnect().connect(); // reconnect so the socket carries the new token
    return data.user;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      // ignore
    }
    setUser(null);
    socket.disconnect().connect(); // reconnect as an anonymous socket
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}