import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createOrder, getRecommendations } from "../../api/http";
import { useCart } from "../../context/CartContext";
import { rupees } from "../../utils/money";

export default function CartPage() {
  const { tableNumber, items, add, decrease, totalPaise, clear } = useCart();
  const navigate = useNavigate();
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  // Refetch suggestions only when the SET of items changes, not on quantity changes
  const idsKey = items
    .map((i) => i.menuItemId)
    .sort((a, b) => a - b)
    .join(",");

  useEffect(() => {
    if (!idsKey) return;
    let cancelled = false;
    getRecommendations(idsKey.split(",").map(Number))
      .then((r) => {
        if (!cancelled) setSuggestions(r);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]); // suggestions are optional, never block the cart
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  if (!tableNumber)
    return <p className="p-4">Please scan your table's QR code to start ordering.</p>;

  if (items.length === 0)
    return (
      <div className="mx-auto max-w-md p-4">
        <p className="mb-3">Your cart is empty.</p>
        <Link to={`/table/${tableNumber}`} className="font-semibold text-orange-600">
          Back to menu
        </Link>
      </div>
    );

  async function placeOrder() {
    setSubmitting(true);
    setError("");
    try {
      const order = await createOrder({
        tableNumber,
        notes: notes.trim() || undefined,
        items: items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
      });
      clear();
      navigate(`/order/${order.id}`, { replace: true });
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-4 pb-28">
      <Link to={`/table/${tableNumber}`} className="text-sm font-semibold text-orange-600">
        ← Back to menu
      </Link>
      <h1 className="mt-2 text-xl font-bold">Your order · Table {tableNumber}</h1>

      <div className="mt-3">
        {items.map((i) => (
          <div key={i.menuItemId} className="flex items-center justify-between border-b py-3">
            <div>
              <p className="font-medium">{i.name}</p>
              <p className="text-sm text-gray-500">{rupees(i.pricePaise)} each</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-lg bg-orange-600 text-white">
                <button onClick={() => decrease(i.menuItemId)} className="px-3 py-1 text-lg">
                  −
                </button>
                <span className="w-6 text-center text-sm font-semibold">{i.quantity}</span>
                <button
                  onClick={() => add({ id: i.menuItemId, name: i.name, pricePaise: i.pricePaise })}
                  className="px-3 py-1 text-lg"
                >
                  +
                </button>
              </div>
              <span className="w-16 text-right font-semibold">
                {rupees(i.pricePaise * i.quantity)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {suggestions.length > 0 && (
        <section className="mt-5 rounded-lg bg-orange-50 p-3">
          <h2 className="mb-2 font-semibold text-orange-700">You may also like</h2>
          <div className="space-y-2">
            {suggestions.map((s) => (
              <div
                key={s.menuItemId}
                className="flex items-center justify-between gap-3 rounded-lg bg-white p-2"
              >
                <div className="min-w-0">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.reason}</p>
                  <p className="text-sm font-semibold">{rupees(s.pricePaise)}</p>
                </div>
                <button
                  onClick={() => add({ id: s.menuItemId, name: s.name, pricePaise: s.pricePaise })}
                  className="shrink-0 rounded-lg border border-orange-600 px-4 py-1.5 text-sm font-semibold text-orange-600"
                >
                  ADD
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        maxLength={300}
        placeholder="Any instructions for the kitchen? (optional)"
        className="mt-4 w-full rounded-lg border p-2 text-sm"
        rows={2}
      />

      <p className="mt-3 text-sm text-gray-500">Payment: pay at the counter</p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t bg-white p-4">
        <button
          onClick={placeOrder}
          disabled={submitting}
          className="flex w-full items-center justify-between rounded-lg bg-green-600 px-4 py-3 font-semibold text-white disabled:opacity-60"
        >
          <span>{submitting ? "Placing order..." : "PLACE ORDER"}</span>
          <span>{rupees(totalPaise)}</span>
        </button>
      </div>
    </div>
  );
}