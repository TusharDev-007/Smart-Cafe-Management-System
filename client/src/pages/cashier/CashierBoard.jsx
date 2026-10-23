import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { confirmCounterPayment, getPendingPayments, rejectOrder } from "../../api/http";
import { socket } from "../../api/socket";
import { useAuth } from "../../context/AuthContext";
import { UNPAID_EXPIRY_MINUTES } from "../../utils/constants";
import { rupees } from "../../utils/money";

const minutesSince = (iso, now) =>
  Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));

export default function CashierBoard() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [connected, setConnected] = useState(socket.connected);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const handleError = useCallback(
    (e) => {
      if (e.status === 401) logout();
      else setError(e.message);
    },
    [logout]
  );

  // Keep an order only while it is still waiting for payment
  const upsert = useCallback((order) => {
    setOrders((prev) => {
      if (order.status !== "PENDING_PAYMENT") return prev.filter((o) => o.id !== order.id);
      return prev.some((o) => o.id === order.id)
        ? prev.map((o) => (o.id === order.id ? order : o))
        : [...prev, order];
    });
  }, []);

  const load = useCallback(
    () =>
      getPendingPayments()
        .then((list) => {
          setOrders(list);
          setError("");
        })
        .catch(handleError),
    [handleError]
  );

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // On every (re)connect: join the cashier room and reload so nothing is missed
    const onConnect = () => {
      setConnected(true);
      socket.emit("join:cashier", (res) => {
        if (!res?.ok) logout();
      });
      load();
    };
    const onDisconnect = () => setConnected(false);

    if (socket.connected) onConnect();
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("order:pending", upsert);
    socket.on("order:updated", upsert);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("order:pending", upsert);
      socket.off("order:updated", upsert);
    };
  }, [load, logout, upsert]);

  async function confirmOne(order) {
    setBusy(true);
    setError("");
    try {
      upsert(await confirmCounterPayment(order.id));
    } catch (e) {
      handleError(e);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function confirmTable(group) {
    const total = group.reduce((s, o) => s + o.totalPaise, 0);
    const tableNo = group[0].table.number;
    if (!window.confirm(`Confirm payment of ${rupees(total)} for Table ${tableNo} (${group.length} orders)?`))
      return;
    setBusy(true);
    setError("");
    try {
      for (const o of group) upsert(await confirmCounterPayment(o.id));
    } catch (e) {
      handleError(e);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function reject(order) {
    if (!window.confirm(`Reject order #${order.id} from Table ${order.table.number}?`)) return;
    setBusy(true);
    setError("");
    try {
      upsert(await rejectOrder(order.id));
    } catch (e) {
      handleError(e);
      await load();
    } finally {
      setBusy(false);
    }
  }

  // Group the waiting orders by table, oldest first
  const groups = Object.values(
    orders.reduce((acc, o) => {
      (acc[o.table.number] ||= []).push(o);
      return acc;
    }, {})
  ).sort((a, b) => new Date(a[0].createdAt) - new Date(b[0].createdAt));

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="flex flex-wrap items-center justify-between gap-2 bg-gray-900 px-4 py-3 text-white">
        <h1 className="text-lg font-bold">Cashier</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className={connected ? "text-green-400" : "text-red-400"}>
            ● {connected ? "Live" : "Offline"}
          </span>
          {user.role === "ADMIN" && (
            <Link to="/admin" className="rounded border border-gray-500 px-2 py-1">
              ← Admin
            </Link>
          )}
          <span className="text-gray-300">{user.name}</span>
          <button onClick={logout} className="rounded bg-gray-700 px-2 py-1">
            Log out
          </button>
        </div>
      </header>

      {error && <p className="bg-red-100 px-4 py-2 text-sm text-red-700">{error}</p>}

      <main className="mx-auto max-w-3xl space-y-4 p-4">
        <p className="text-sm text-gray-600">
          Orders waiting for payment. Confirm only after you have received the money. Unpaid orders are
          cancelled after {UNPAID_EXPIRY_MINUTES} minutes.
        </p>

        {groups.length === 0 && (
          <p className="rounded-lg bg-white p-6 text-center text-gray-500 shadow">
            No orders waiting for payment.
          </p>
        )}

        {groups.map((group) => {
          const tableNo = group[0].table.number;
          const total = group.reduce((s, o) => s + o.totalPaise, 0);
          return (
            <section key={tableNo} className="rounded-lg bg-white p-4 shadow">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-bold">Table {tableNo}</h2>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">
                    {group.length} {group.length === 1 ? "order" : "orders"} · {rupees(total)}
                  </span>
                  {group.length > 1 && (
                    <button
                      disabled={busy}
                      onClick={() => confirmTable(group)}
                      className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      Confirm all
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {group.map((o) => {
                  const mins = minutesSince(o.createdAt, now);
                  return (
                    <div key={o.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-extrabold">#{o.id}</span>
                        <span
                          className={`text-sm ${
                            mins >= UNPAID_EXPIRY_MINUTES - 5 ? "font-bold text-red-600" : "text-gray-500"
                          }`}
                        >
                          {mins} min ago
                        </span>
                      </div>
                      <ul className="mt-2 text-sm">
                        {o.items.map((i) => (
                          <li key={i.id}>
                            <b>{i.quantity} ×</b> {i.nameSnapshot}
                          </li>
                        ))}
                      </ul>
                      {o.notes && <p className="mt-2 rounded bg-yellow-100 p-2 text-sm">📝 {o.notes}</p>}
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          disabled={busy}
                          onClick={() => confirmOne(o)}
                          className="flex-1 rounded-lg bg-green-600 py-2 font-semibold text-white disabled:opacity-60"
                        >
                          Payment received · {rupees(o.totalPaise)}
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => reject(o)}
                          className="rounded-lg border border-red-500 px-3 py-2 text-red-600 disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}