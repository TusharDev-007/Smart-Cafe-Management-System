import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getMenu } from "../../api/http";
import { useCart } from "../../context/CartContext";
import { CAFE_NAME } from "../../utils/constants";
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

// Category photo files live in client/public/categories/ (served as /categories/<file>).
// The same file can be used for several categories. If a photo is missing, the card
// falls back to a big emoji, so nothing breaks while photos are still being added.
const CATEGORY_IMAGES = {
  "Rolls": { img: "rolls.jpg", emoji: "🌯" },
  "Fun With Fry": { img: "fun-with-fry.jpg", emoji: "🍟" },
  "Platters & Thalis": { img: "thali.jpg", emoji: "🍱" },
  "Sides": { img: "sides.jpg", emoji: "🥗" },
  "JGF Tandoori Zaika": { img: "tandoori-chaap.jpg", emoji: "🍢" },
  "Paneer Tikka": { img: "paneer-tikka.jpg", emoji: "🧀" },
  "Mushroom Tikka": { img: "mushroom-tikka.jpg", emoji: "🍄" },
  "Kuch Shahi Sa": { img: "curries.jpg", emoji: "🍛" },
  "Tawa Special": { img: "tawa-special.jpg", emoji: "🍛" },
  "Breads": { img: "breads.jpg", emoji: "🫓" },
  "Tandoori Momos (7 pcs)": { img: "tandoori-momos.jpg", emoji: "🥟" },
  "Steam Momos (7 pcs)": { img: "steam-momos.jpg", emoji: "🥟" },
  "Combos": { img: "combos.jpg", emoji: "🍽️" },
  "Chinese Noodles": { img: "noodles.jpg", emoji: "🍜" },
  "Rice": { img: "rice.jpg", emoji: "🍚" },
  "Rice Combo": { img: "rice-combo.jpg", emoji: "🍚" },
  "Shakes": { img: "shakes.jpg", emoji: "🥤" },
  "Mocktails": { img: "mocktails.jpg", emoji: "🍹" },
  "Snacks": { img: "snacks.jpg", emoji: "🍟" },
};

function CategoryCard({ cat, badge, onOpen }) {
  const [failed, setFailed] = useState(false);
  const meta = CATEGORY_IMAGES[cat.name] || {};
  const showImg = meta.img && !failed;
  return (
    <button
      onClick={onOpen}
      className="relative w-full overflow-hidden rounded-xl bg-orange-100 text-left shadow-sm transition active:scale-95"
      style={{ aspectRatio: "4 / 3" }}
    >
      {showImg ? (
        <img
          src={`/categories/${meta.img}`}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center pb-6 text-5xl">
          {meta.emoji || "🍽️"}
        </span>
      )}
      <span
        className="absolute inset-x-0 bottom-0 px-3 pb-2 pt-8"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0))" }}
      >
        <span className="block text-sm font-bold uppercase leading-tight tracking-wide text-white">
          {cat.name}
        </span>
        <span className="block text-xs text-white/80">
          {cat.items.length} {cat.items.length === 1 ? "item" : "items"}
        </span>
      </span>
      {badge > 0 && (
        <span className="absolute right-2 top-2 rounded-full bg-orange-600 px-2 py-0.5 text-xs font-semibold text-white shadow">
          {badge}
        </span>
      )}
    </button>
  );
}

function ItemRow({ item, qty, add, decrease, categoryName }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <VegMark isVeg={item.isVeg} />
          <span className="font-medium">{item.name}</span>
        </div>
        {categoryName && <p className="mt-0.5 text-xs text-orange-600">{categoryName}</p>}
        {item.description && <p className="mt-0.5 text-sm text-gray-500">{item.description}</p>}
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
}

export default function MenuPage() {
  const { setTable, items, add, decrease, count, totalPaise } = useCart();
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  // The open category lives in the URL (?cat=5) so Back from the cart returns to it
  const [searchParams, setSearchParams] = useSearchParams();
  const catId = Number(searchParams.get("cat")) || null;

  // One shared QR code: every order uses the single hidden table 1
  useEffect(() => {
    setTable(1);
  }, [setTable]);

  useEffect(() => {
    getMenu().then(setMenu).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [catId]);

  const q = query.trim().toLowerCase();

  const categories = useMemo(() => (menu ? menu.filter((c) => c.items.length > 0) : []), [menu]);

  // Search runs across ALL categories
  const results = useMemo(() => {
    if (!q) return [];
    return categories.flatMap((cat) =>
      cat.items
        .filter(
          (i) =>
            i.name.toLowerCase().includes(q) || (i.description || "").toLowerCase().includes(q)
        )
        .map((i) => ({ ...i, categoryName: cat.name }))
    );
  }, [categories, q]);

  if (error) return <p className="p-4 text-red-600">{error}</p>;
  if (!menu) return <p className="p-4">Loading menu...</p>;

  const qtyOf = (id) => items.find((i) => i.menuItemId === id)?.quantity ?? 0;
  const activeCat = categories.find((c) => c.id === catId) || null;

  // How many items of a category are already in the cart (shown as a badge)
  const inCartFor = (cat) => {
    const ids = new Set(cat.items.map((i) => i.id));
    return items.reduce((n, i) => (ids.has(i.menuItemId) ? n + i.quantity : n), 0);
  };

  const openCategory = (id) => setSearchParams({ cat: String(id) });
  const closeCategory = () => setSearchParams({});

  return (
    <div className="mx-auto max-w-md pb-24">
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <header className="bg-orange-600 px-4 py-3 text-white">
          <h1 className="text-lg font-bold">{CAFE_NAME}</h1>
          <p className="text-sm opacity-90">Order here, we'll call your name</p>
        </header>
        <ReadyBanner />
        <div className="relative px-4 py-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a dish..."
            aria-label="Search menu"
            className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-3 pr-10 text-sm outline-none focus:border-orange-500"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-6 top-1/2 -translate-y-1/2 text-lg text-gray-500"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="px-4">
        {q ? (
          // ---- Search results (all categories) ----
          <section className="mt-3">
            <p className="mb-1 text-sm text-gray-500">
              {results.length} {results.length === 1 ? "result" : "results"} for “{query.trim()}”
            </p>
            {results.length === 0 && (
              <p className="py-6 text-center text-gray-500">No dishes found. Try another word.</p>
            )}
            {results.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                qty={qtyOf(item.id)}
                add={add}
                decrease={decrease}
                categoryName={item.categoryName}
              />
            ))}
          </section>
        ) : activeCat ? (
          // ---- One category ----
          <section className="mt-3">
            <button
              onClick={closeCategory}
              className="text-sm font-semibold text-orange-600"
            >
              ← All categories
            </button>
            <h2 className="mt-1 text-lg font-semibold text-orange-600">{activeCat.name}</h2>
            {activeCat.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                qty={qtyOf(item.id)}
                add={add}
                decrease={decrease}
              />
            ))}
          </section>
        ) : (
          // ---- Category list (home) ----
          <>
            <YourOrders />
            <h2 className="mb-2 mt-4 text-lg font-semibold">Categories</h2>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  cat={cat}
                  badge={inCartFor(cat)}
                  onOpen={() => openCategory(cat.id)}
                />
              ))}
            </div>
          </>
        )}
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