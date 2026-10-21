import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { trackOrder } from "../../api/http";
import { socket } from "../../api/socket";
import { PAYMENT_CANCELLED, payForOrder } from "../../utils/payment";
import { rupees } from "../../utils/money";

const STEPS = ["NEW", "PREPARING", "READY", "SERVED"];
const LABELS = {
  NEW: "Order received",
  PREPARING: "Being prepared",
  READY: "Ready",
  SERVED: "Served",
};

export default function OrderStatusPage() {
  const { token } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  useEffect(() => {
    const load = () =>
      trackOrder(token)
        .then(setOrder)
        .catch(() => setError("We couldn't find this order. Please ask the staff for help."));

    // Join this order's private room, and reload so nothing is missed after a reconnect
    const join = () => {
      socket.emit("join:order", token);
      load();
    };
    const onUpdated = (o) => {
      if (o.publicToken === token) setOrder(o);
    };

    if (socket.connected) join();
    socket.on("connect", join);
    socket.on("order:updated", onUpdated);

    return () => {
      socket.off("connect", join);
      socket.off("order:updated", onUpdated);
    };
  }, [token]);

  async function pay() {
    setPaying(true);
    setPayError("");
    try {
      setOrder(await payForOrder(token));
    } catch (e) {
      if (e.message !== PAYMENT_CANCELLED) setPayError(e.message);
    } finally {
      setPaying(false);
    }
  }

  if (error) return <p className="p-4 text-red-600">{error}</p>;
  if (!order) return <p className="p-4">Loading...</p>;

  const cancelled = order.status === "CANCELLED";
  const awaitingPayment = order.status === "PENDING_PAYMENT";
  const currentStep = STEPS.indexOf(order.status);

  let paymentLine = "Pay at the counter";
  if (order.paymentMethod === "ONLINE") {
    paymentLine = order.paymentStatus === "PAID" ? "Paid online ✓" : "Online payment pending";
  }

  return (
    <div className="mx-auto max-w-md p-4">
      <h1 className="text-xl font-bold">Order #{order.id}</h1>
      <p className="text-sm text-gray-500">Table {order.table.number}</p>

      {cancelled ? (
        <p className="mt-4 rounded-lg bg-red-50 p-3 font-semibold text-red-700">
          This order was cancelled. Please speak to the staff.
        </p>
      ) : awaitingPayment ? (
        <div className="mt-4 rounded-lg bg-amber-50 p-3">
          <p className="font-semibold text-amber-800">Payment pending</p>
          <p className="text-sm text-amber-700">
            Your order goes to the kitchen as soon as the payment is complete.
          </p>
          <button
            onClick={pay}
            disabled={paying}
            className="mt-3 w-full rounded-lg bg-green-600 py-2 font-semibold text-white disabled:opacity-60"
          >
            {paying ? "Opening payment..." : `Pay ${rupees(order.totalPaise)}`}
          </button>
          {payError && <p className="mt-2 text-sm text-red-600">{payError}</p>}
        </div>
      ) : (
        <ol className="mt-5 space-y-3">
          {STEPS.map((step, idx) => {
            const done = idx <= currentStep;
            return (
              <li key={step} className="flex items-center gap-3">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                    done ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {done ? "✓" : idx + 1}
                </span>
                <span className={done ? "font-semibold" : "text-gray-400"}>{LABELS[step]}</span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-6 border-t pt-3">
        {order.items.map((i) => (
          <div key={i.id} className="flex justify-between py-1 text-sm">
            <span>
              {i.quantity} × {i.nameSnapshot}
            </span>
            <span>{rupees(i.unitPricePaise * i.quantity)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t pt-2 font-bold">
          <span>Total</span>
          <span>{rupees(order.totalPaise)}</span>
        </div>
        <p className="mt-1 text-sm text-gray-500">{paymentLine}</p>
      </div>

      <Link
        to={`/table/${order.table.number}`}
        className="mt-6 block rounded-lg border border-orange-600 py-2 text-center font-semibold text-orange-600"
      >
        Order more
      </Link>
    </div>
  );
}