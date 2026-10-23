import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMenu } from "../../api/http";
import { useCart } from "../../context/CartContext";
import { rupees } from "../../utils/money";
import ReadyBanner from "../../components/ReadyBanner";
import YourOrders from "../../components/YourOrders";

function VegMark({ isVeg }) {
  return (
    <span
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2 bg-white ${
        isVeg ? "border-green-600" : "border-red-600"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${isVeg ? "bg-green-600" : "bg-red-600"}`} />
    </span>
  );
}

export default function MenuPage() {
  const { number } = useParams();
  const tableNumber = Number(number);
  const validTable = Number.isInteger(tableNumber) && tableNumber > 0;

  const { setTable, items, add, decrease, count, totalPaise } = useCart();
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (validTable) setTable(tableNumber);
  }, [validTable, tableNumber, setTable]);

  useEffect(() => {
    getMenu().then(setMenu).catch((e) => setError(e.message));
  }, []);

  if (!validTable)
    return <p className="p-4 text-red-600">Invalid table link. Please scan the QR code again.</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;
  if (!menu) return <p className="p-4">Loading menu...</p>;

  const qtyOf = (id) => items.find((i) => i.menuItemId === id)?.quantity ?? 0;

  return (
    <div className="mx-auto max-w-md pb-24">
      <div className="sticky top-0 z-10">
      <header className="bg-orange-600 px-4 py-3 text-white">
        <h1 className="text-lg font-bold">Café Menu</h1>
        <p className="text-sm opacity-90">Table {tableNumber}</p>
            </header>
      <ReadyBanner />
      </div>

      <div className="px-4">
      <YourOrders />
        {menu.map((cat) => (
          <section key={cat.id} className="mt-5">
            <h2 className="mb-2 text-lg font-semibold text-orange-600">{cat.name}</h2>
            {cat.items.map((item) => {
              const qty = qtyOf(item.id);
              return (
                <div key={item.id} className="flex items-start justify-between gap-3 border-b py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <VegMark isVeg={item.isVeg} />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">{item.description}</p>
                    <p className="mt-1 font-semibold">{rupees(item.pricePaise)}</p>
                  </div>

                  {qty === 0 ? (
                    <button
                      onClick={() => add(item)}
                      className="shrink-0 rounded-lg border border-orange-600 px-4 py-1.5 text-sm font-semibold text-orange-600"
                    >
                      ADD
                    </button>
                  ) : (
                    <div className="flex shrink-0 items-center rounded-lg bg-orange-600 text-white">
                      <button onClick={() => decrease(item.id)} className="px-3 py-1.5 text-lg">
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                      <button onClick={() => add(item)} className="px-3 py-1.5 text-lg">
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        ))}
      </div>

      {count > 0 && (
        <Link
          to="/cart"
          className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md items-center justify-between bg-green-600 px-4 py-4 text-white"
        >
          <span className="font-semibold">
            VIEW CART · {count} {count === 1 ? "item" : "items"}
          </span>
          <span className="font-semibold">{rupees(totalPaise)}</span>
        </Link>
      )}
    </div>
  );
}