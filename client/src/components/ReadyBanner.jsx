import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useMyOrders } from "../context/MyOrdersContext";

// Green banner shown on any customer page while one of this table's orders is ready
export default function ReadyBanner({ excludeToken }) {
  const { tableNumber } = useCart();
  const { forTable } = useMyOrders();
  const ready = forTable(tableNumber).filter(
    (o) => o.status === "READY" && o.publicToken !== excludeToken
  );
  if (ready.length === 0) return null;

  return (
    <div className="bg-green-600 px-4 py-2 text-center text-sm font-semibold text-white">
      {ready.map((o) => (
        <Link key={o.publicToken} to={`/order/${o.publicToken}`} className="block">
          ✅ Order #{o.id} is ready!
        </Link>
      ))}
    </div>
  );
}