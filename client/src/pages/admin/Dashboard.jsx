import { useCallback, useEffect, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AdminHeader from "../../components/AdminHeader";
import { getHeatmap, getHourly, getSummary, getTopItems } from "../../api/http";
import { socket } from "../../api/socket";
import { useAuth } from "../../context/AuthContext";
import { rupees } from "../../utils/money";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ROW_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first
const RANGES = [
  { days: 1, label: "Today" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
];

const fmtHour = (h) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function Heatmap({ data }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="ml-10 grid grid-cols-[repeat(24,minmax(0,1fr))] gap-0.5 text-center text-[10px] text-gray-500">
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h}>{h % 3 === 0 ? fmtHour(h) : ""}</span>
          ))}
        </div>
        {ROW_ORDER.map((wd) => (
          <div key={wd} className="mt-0.5 flex items-center">
            <span className="w-10 text-xs text-gray-500">{DAY_NAMES[wd]}</span>
            <div className="grid flex-1 grid-cols-[repeat(24,minmax(0,1fr))] gap-0.5">
              {data.matrix[wd].map((count, h) => (
                <div
                  key={h}
                  title={`${DAY_NAMES[wd]} ${fmtHour(h)}: ${count} orders`}
                  className="h-6 rounded-sm bg-gray-100"
                  style={
                    count > 0
                      ? { backgroundColor: `rgba(234, 88, 12, ${Math.max(0.12, count / data.max)})` }
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { logout } = useAuth();
  const [range, setRange] = useState(1);
  const [summary, setSummary] = useState(null);
  const [hourly, setHourly] = useState([]);
  const [heatmap, setHeatmap] = useState(null);
  const [top, setTop] = useState([]);
  const [error, setError] = useState("");
  const timer = useRef(null);

  const load = useCallback(async () => {
    try {
      const [s, h, m, t] = await Promise.all([
        getSummary(),
        getHourly(range),
        getHeatmap(30),
        getTopItems(range),
      ]);
      setSummary(s);
      setHourly(h.map((b) => ({ ...b, label: fmtHour(b.hour) })));
      setHeatmap(m);
      setTop(t);
      setError("");
    } catch (e) {
      if (e.status === 401) logout();
      else setError(e.message);
    }
  }, [range, logout]);

  // Initial load, plus a refresh every minute as a safety net
  useEffect(() => {
    load();
    const poll = setInterval(load, 60000);
    return () => clearInterval(poll);
  }, [load]);

  // Live: refresh shortly after any order event
  useEffect(() => {
    const scheduleReload = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(load, 500);
    };
    const onConnect = () => socket.emit("join:kitchen"); // admins may join the order feed
    if (socket.connected) onConnect();
    socket.on("connect", onConnect);
    socket.on("order:new", scheduleReload);
    socket.on("order:updated", scheduleReload);
    return () => {
      socket.off("connect", onConnect);
      socket.off("order:new", scheduleReload);
      socket.off("order:updated", scheduleReload);
      clearTimeout(timer.current);
    };
  }, [load]);

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminHeader />
      <main className="mx-auto max-w-6xl space-y-4 p-4">
        {error && <p className="rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>}
        {!summary ? (
          <p>Loading...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <StatCard
                label="Sales today"
                value={rupees(summary.todaySalesPaise)}
                hint={`Yesterday: ${rupees(summary.yesterdaySalesPaise)}`}
              />
              <StatCard label="Orders today" value={summary.todayOrders} />
              <StatCard label="Avg order value" value={rupees(summary.avgOrderPaise)} />
              <StatCard label="Active orders" value={summary.activeOrders} hint="In the kitchen now" />
              <StatCard
                label="Peak window"
                value={
                  summary.peakWindow
                    ? `${fmtHour(summary.peakWindow.startHour)}–${fmtHour(summary.peakWindow.endHour)}`
                    : "No data"
                }
                hint="Busiest 2 hours, last 30 days"
              />
            </div>

            <section className="rounded-lg bg-white p-4 shadow">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">Orders by hour</h2>
                <div className="flex gap-1">
                  {RANGES.map((r) => (
                    <button
                      key={r.days}
                      onClick={() => setRange(r.days)}
                      className={`rounded px-3 py-1 text-sm ${
                        range === r.days ? "bg-orange-600 text-white" : "bg-gray-100"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourly}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" interval={1} tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} width={30} />
                    <Tooltip formatter={(v) => [v, "Orders"]} />
                    <Bar dataKey="orders" fill="#ea580c" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-3">
              <section className="rounded-lg bg-white p-4 shadow lg:col-span-2">
                <h2 className="mb-3 font-semibold">Busy-hour heatmap (last 30 days)</h2>
                {heatmap && <Heatmap data={heatmap} />}
                <p className="mt-2 text-xs text-gray-500">Darker means more orders.</p>
              </section>

              <section className="rounded-lg bg-white p-4 shadow">
                <h2 className="mb-3 font-semibold">
                  Top items ({range === 1 ? "today" : `last ${range} days`})
                </h2>
                {top.length === 0 ? (
                  <p className="text-sm text-gray-500">No orders in this period.</p>
                ) : (
                  <ol className="space-y-2">
                    {top.map((t, i) => (
                      <li key={t.name} className="flex justify-between text-sm">
                        <span>
                          {i + 1}. {t.name}
                        </span>
                        <span className="font-semibold">{t.quantity}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}