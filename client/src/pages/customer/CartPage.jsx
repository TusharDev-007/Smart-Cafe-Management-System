import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createOrder, getPaymentConfig, getRecommendations } from "../../api/http";
import ReadyBanner from "../../components/ReadyBanner";
import YourOrders from "../../components/YourOrders";
import { useCart } from "../../context/CartContext";
import { useMyOrders } from "../../context/MyOrdersContext";
import { payForOrder } from "../../utils/payment";
import { rupees } from "../../utils/money";

const NAME_KEY = "cafe-customer-name";

function loadName() {
  try {
    return localStorage.getItem(NAME_KEY) || "";
  } catch {
    return "";
  }
}

export default function CartPage() {
  const { tableNumber, items, add, decrease, totalPaise, clear } = useCart();
  const { addOrder, visitItemIds } = useMyOrders();
  const navigate = useNavigate();
  const [customerName, setCustomerName] = useState(loadName);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [onlineEnabled, setOnlineEnabled] = useState(false);
  const [method, setMethod] = useState("COUNTER");
  const [isPacking, setIsPacking] = useState(false);

  const nameOk = customerName.trim().length >= 2;

  // Refetch suggestions only when the SET of items changes, not on quantity changes
  const idsKey = items
    .map((i) => i.menuItemId)
    .sort((a, b) => a - b)
    .join(",");

  // Items already ordered during this visit
  const earlierKey = visitItemIds(tableNumber).join(",");

  useEffect(() => {
    if (!idsKey) return;
    let cancelled = false;
    const earlier = earlierKey ? earlierKey.split(",").map(Number) : [];
    getRecommendations(idsKey.split(",").map(Number), earlier)
      .then((r) => {
        if (!cancelled) setSuggestions(r);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]); // suggestions are optional, never block the cart
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey, earlierKey]);

  // Is online payment configured on the server?
  useEffect(() => {
    let cancelled = false;
    getPaymentConfig()
      .then((c) => {
        if (!cancelled) setOnlineEnabled(c.enabled);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (items.length === 0)
    return (
      <div className="mx-auto max-w-md p-4">
        <p className="mb-3">Your cart is empty.</p>
        <Link to="/" className="font-semibold text-orange-600">
          Back to menu
        </Link>
      </div>
    );

  const paymentMethod = onlineEnabled ? method : "COUNTER";

  async function placeOrder() {
    const name = customerName.trim().replace(/\s+/g, " ");
    if (name.length < 2) {
      setError("Please enter your name so we can call you when your order is ready.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const order = await createOrder({
        customerName: name,
        paymentMethod,
        notes: notes.trim() || undefined,
        items: items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
        isPacking,
      });
      try {
        localStorage.setItem(NAME_KEY, name); // remember it for the next order on this phone
      } catch {
        // storage unavailable
      }
      addOrder(order); // remember it on this device for the "Your orders" list

      if (paymentMethod === "ONLINE") {
        try {
          await payForOrder(order.publicToken);
        } catch {
          // Cancelled or failed: the order is saved, and its status page offers "Pay now"
        }
      }

      clear();
      navigate(`/order/${order.publicToken}`, { replace: true });
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-4 pb-28">
      <div className="sticky top-0 z-20 -mx-4 -mt-4 mb-3">
        <ReadyBanner />
      </div>

      <Link to="/" className="text-sm font-semibold text-orange-600">
        ← Back to menu
      </Link>
      <h1 className="mt-2 text-xl font-bold">Your order</h1>

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

      <YourOrders />

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

      <div className="mt-4">
        <label htmlFor="customer-name" className="mb-1 block text-sm font-semibold text-slate-700">
          Your name <span className="text-red-600">*</span>
        </label>
        <input
          id="customer-name"
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          maxLength={30}
          autoComplete="given-name"
          placeholder="Enter your name"
          className={`w-full rounded-lg border p-2 text-sm ${
            customerName && !nameOk ? "border-red-400" : ""
          }`}
        />
        <p className="mt-1 text-xs text-gray-500">We call this name when your order is ready.</p>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        maxLength={300}
        placeholder="Any instructions for the kitchen? (optional)"
        className="mt-4 w-full rounded-lg border p-2 text-sm"
        rows={2}
      />
      <div className="mb-4">
        <p className="mb-2 text-sm font-semibold text-slate-700">How would you like your order?</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { v: false, label: "Dine-in", icon: "🍽️" },
            { v: true, label: "Packing (take-away)", icon: "🛍️" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => setIsPacking(o.v)}
              className={`rounded-xl border-2 px-3 py-3 text-sm font-medium transition ${
                isPacking === o.v
                  ? "border-orange-500 bg-orange-50 text-orange-700"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <span className="mr-1">{o.icon}</span>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {onlineEnabled ? (
        <fieldset className="mt-4">
          <legend className="mb-1 text-sm font-semibold">Payment</legend>
          {[
            ["COUNTER", "Pay at the counter (your order starts once the cashier confirms)"],
            ["ONLINE", "Pay online now (UPI / card)"],
          ].map(([value, label]) => (
            <label
              key={value}
              className={`mb-2 flex items-center gap-2 rounded-lg border p-3 ${
                method === value ? "border-orange-600 bg-orange-50" : ""
              }`}
            >
              <input
                type="radio"
                name="payment"
                value={value}
                checked={method === value}
                onChange={() => setMethod(value)}
              />
              {label}
            </label>
          ))}
        </fieldset>
      ) : (
        <p className="mt-3 text-sm text-gray-500">
          Payment: pay at the counter first. Your order starts once the cashier confirms.
        </p>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t bg-white p-4">
        {!nameOk && (
          <p className="mb-2 text-center text-xs text-red-600">Enter your name to place the order</p>
        )}
        <button
          onClick={placeOrder}
          disabled={submitting || !nameOk}
          className="flex w-full items-center justify-between rounded-lg bg-green-600 px-4 py-3 font-semibold text-white disabled:opacity-60"
        >
          <span>
            {submitting
              ? "Please wait..."
              : paymentMethod === "ONLINE"
                ? "PAY & PLACE ORDER"
                : "PLACE ORDER"}
          </span>
          <span>{rupees(totalPaise)}</span>
        </button>
      </div>
    </div>
  );
}