import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useMyOrders } from "../context/MyOrdersContext";
import { rupees } from "../utils/money";

const LABELS = {
  PENDING_PAYMENT: "Waiting for payment",
  NEW: "Order received",
  PREPARING: "Being prepared",
  READY: "Ready!",
  SERVED: "Served",
  CANCELLED: "Cancelled",
};

const TONE = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-800",
  NEW: "bg-blue-100 text-blue-800",
  PREPARING: "bg-orange-100 text-orange-800",
  READY: "bg-green-100 text-green-800",
  SERVED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function YourOrders({ minOrders = 1 }) {
  const { tableNumber } = useCart();
  const { forTable, dismiss } = useMyOrders();
  const orders = forTable(tableNumber);
  if (orders.length < minOrders) return null;

  // Counter orders the customer still has to pay for, as one combined amount
  const toPay = orders.filter((o) => o.status === "PENDING_PAYMENT" && o.paymentMethod === "COUNTER");
  const toPayTotal = toPay.reduce((sum, o) => sum + o.totalPaise, 0);

  return (
    <section className="mt-4 rounded-lg border bg-white p-3">
      <h2 className="mb-2 font-semibold">Your orders · Table {tableNumber}</h2>

      {toPayTotal > 0 && (
        <p className="mb-2 rounded bg-amber-50 p-2 text-sm text-amber-900">
          To pay at the counter: <b>{rupees(toPayTotal)}</b> for {toPay.map((o) => `#${o.id}`).join(", ")}
        </p>
      )}

      <ul className="space-y-2">
        {orders.map((o) => (
          <li key={o.publicToken} className="flex items-center gap-2 text-sm">
            <Link to={`/order/${o.publicToken}`} className="flex flex-1 items-center justify-between gap-2">
              <span className="font-semibold">#{o.id}</span>
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${TONE[o.status]}`}>
                {LABELS[o.status]}
              </span>
              <span>{rupees(o.totalPaise)}</span>
            </Link>
            {(o.status === "SERVED" || o.status === "CANCELLED") && (
              <button
                onClick={() => dismiss(o.publicToken)}
                aria-label={`Hide order ${o.id}`}
                className="px-1 text-gray-400"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}