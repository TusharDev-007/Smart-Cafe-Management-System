import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import AdminHeader from "../../components/AdminHeader";
import { addTable, getTables } from "../../api/http";

const BASE_KEY = "cafe-qr-base";

function loadBase() {
  try {
    return localStorage.getItem(BASE_KEY) || window.location.origin;
  } catch {
    return window.location.origin;
  }
}

export default function TableQRCodes() {
  const [tables, setTables] = useState([]);
  const [base, setBase] = useState(loadBase);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    getTables()
      .then(setTables)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function changeBase(value) {
    setBase(value);
    try {
      localStorage.setItem(BASE_KEY, value);
    } catch {
      // ignore
    }
  }

  async function onAdd() {
    try {
      await addTable();
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  const cleanBase = base.trim().replace(/\/+$/, "");
  const active = tables.filter((t) => t.isActive);

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <AdminHeader />
      <main className="mx-auto max-w-5xl p-4">
        <div className="mb-4 rounded-lg bg-white p-4 shadow print:hidden">
          <label className="text-sm font-semibold">Address customers will open</label>
          <input
            value={base}
            onChange={(e) => changeBase(e.target.value)}
            className="mt-1 w-full rounded-lg border p-2"
            placeholder="http://192.168.1.12:5173"
          />
          {/localhost|127\.0\.0\.1/.test(cleanBase) && (
            <p className="mt-1 text-sm text-amber-700">
              Phones cannot open "localhost". Use your PC's network address (for example
              http://192.168.1.12:5173), or your real domain after deployment.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => window.print()}
              className="rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white"
            >
              Print QR codes
            </button>
            <button onClick={onAdd} className="rounded-lg border px-4 py-2 font-semibold">
              Add table
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 print:grid-cols-3">
          {active.map((t) => (
            <div
              key={t.id}
              className="break-inside-avoid rounded-lg border bg-white p-4 text-center shadow print:shadow-none"
            >
              <p className="text-lg font-bold">Table {t.number}</p>
              <div className="my-3 flex justify-center">
                <QRCodeSVG value={`${cleanBase}/table/${t.number}`} size={160} level="M" />
              </div>
              <p className="text-sm text-gray-600">Scan to view the menu and order</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}