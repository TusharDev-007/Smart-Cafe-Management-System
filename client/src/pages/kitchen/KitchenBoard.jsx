import { useCallback, useEffect, useRef, useState } from "react";
import { getActiveOrders, updateOrderStatus } from "../../api/http";
import { socket } from "../../api/socket";
import { useAuth } from "../../context/AuthContext";

const COLUMNS = [
  { status: "NEW", color: "bg-blue-600", next: "PREPARING", action: "Start preparing" },
  { status: "PREPARING", color: "bg-amber-500", next: "READY", action: "Mark ready" },
  { status: "READY", color: "bg-green-600", next: "SERVED", action: "Mark served" },
];

const minutesSince = (iso, now) =>
  Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));

function playBeep(ctx) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // sound is optional
  }
}

export default function KitchenBoard() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [connected, setConnected] = useState(socket.connected);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [soundOn, setSoundOn] = useState(false);
  const audioRef = useRef(null);
  const soundRef = useRef(false);

  const handleError = useCallback(
    (e) => {
      if (e.status === 401) logout();
      else setError(e.message);
    },
    [logout]
  );

  // Insert or replace an order; finished orders leave the board
  const upsert = useCallback((order) => {
    setOrders((prev) => {
      if (order.status === "SERVED" || order.status === "CANCELLED") {
        return prev.filter((o) => o.id !== order.id);
      }
      return prev.some((o) => o.id === order.id)
        ? prev.map((o) => (o.id === order.id ? order : o))
        : [...prev, order];
    });
  }, []);

  // Refresh elapsed-time labels
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const load = () =>
      getActiveOrders()
        .then((list) => {
          setOrders(list);
          setError("");
        })
        .catch(handleError);

    // On every (re)connect: join the kitchen room and reload so nothing is missed
    const onConnect = () => {
      setConnected(true);
      socket.emit("join:kitchen", (res) => {
        if (!res?.ok) logout();
      });
      load();
    };
    const onDisconnect = () => setConnected(false);
    const onNew = (order) => {
      upsert(order);
      if (soundRef.current && audioRef.current) playBeep(audioRef.current);
    };

    if (socket.connected) onConnect();
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("order:new", onNew);
    socket.on("order:updated", upsert);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("order:new", onNew);
      socket.off("order:updated", upsert);
    };
  }, [handleError, logout, upsert]);

  async function changeStatus(order, status) {
    if (status === "CANCELLED" && !window.confirm(`Cancel order #${order.id}?`)) return;
    setBusyId(order.id);
    try {
      upsert(await updateOrderStatus(order.id, status));
      setError("");
    } catch (e) {
      handleError(e);
    } finally {
      setBusyId(null);
    }
  }

  function toggleSound() {
    if (!soundOn) {
      try {
        // Browsers only allow audio after a click, so it is unlocked here
        audioRef.current =
          audioRef.current || new (window.AudioContext || window.webkitAudioContext)();
        audioRef.current.resume();
        playBeep(audioRef.current);
      } catch {
        // ignore
      }
    }
    soundRef.current = !soundOn;
    setSoundOn(!soundOn);
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="flex flex-wrap items-center justify-between gap-2 bg-gray-900 px-4 py-3 text-white">
        <h1 className="text-lg font-bold">Kitchen Display</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className={connected ? "text-green-400" : "text-red-400"}>
            ● {connected ? "Live" : "Offline"}
          </span>
          <button onClick={toggleSound} className="rounded border border-gray-500 px-2 py-1">
            {soundOn ? "🔔 Sound on" : "🔕 Sound off"}
          </button>
          <span className="text-gray-300">{user.name}</span>
          <button onClick={logout} className="rounded bg-gray-700 px-2 py-1">
            Log out
          </button>
        </div>
      </header>

      {error && <p className="bg-red-100 px-4 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 p-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const list = orders.filter((o) => o.status === col.status);
          return (
            <section key={col.status}>
              <h2 className={`rounded-t-lg px-3 py-2 font-bold text-white ${col.color}`}>
                {col.status} ({list.length})
              </h2>
              <div className="space-y-3 rounded-b-lg bg-gray-200 p-2">
                {list.length === 0 && <p className="p-2 text-sm text-gray-500">No orders</p>}
                {list.map((o) => {
                  const mins = minutesSince(o.createdAt, now);
                  return (
                    <div key={o.id} className="rounded-lg bg-white p-3 shadow">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold">#{o.id}</span>
                        <span className="font-semibold">Table {o.table.number}</span>
                        <span
                          className={`text-sm ${
                            mins >= 15 && o.status !== "READY"
                              ? "font-bold text-red-600"
                              : "text-gray-500"
                          }`}
                        >
                          {mins} min
                        </span>
                      </div>
                      <ul className="mt-2 text-sm">
                        {o.items.map((i) => (
                          <li key={i.id}>
                            <b>{i.quantity} ×</b> {i.nameSnapshot}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                            o.paymentStatus === "PAID"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {o.paymentStatus === "PAID" ? "PAID ONLINE" : "PAY AT COUNTER"}
                        </span>
                      </p>
                      {o.notes && (
                        <p className="mt-2 rounded bg-yellow-100 p-2 text-sm">📝 {o.notes}</p>
                      )}
                      <div className="mt-3 flex gap-2">
                        <button
                          disabled={busyId === o.id}
                          onClick={() => changeStatus(o, col.next)}
                          className={`flex-1 rounded-lg py-2 font-semibold text-white disabled:opacity-60 ${col.color}`}
                        >
                          {col.action}
                        </button>
                        {o.status !== "READY" && (
                          <button
                            disabled={busyId === o.id}
                            onClick={() => changeStatus(o, "CANCELLED")}
                            className="rounded-lg border border-red-500 px-3 text-red-600 disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}