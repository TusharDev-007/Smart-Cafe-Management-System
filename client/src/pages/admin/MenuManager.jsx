import { useCallback, useEffect, useState } from "react";
import AdminHeader from "../../components/AdminHeader";
import {
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  getAdminMenu,
  updateCategory,
  updateItem,
} from "../../api/http";
import { useAuth } from "../../context/AuthContext";
import { rupees } from "../../utils/money";

function ItemForm({ categories, initial, onSave, onCancel }) {
  const [name, setName] = useState(initial.name ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [price, setPrice] = useState(initial.pricePaise ? String(initial.pricePaise / 100) : "");
  const [categoryId, setCategoryId] = useState(initial.categoryId ?? categories[0]?.id);
  const [isVeg, setIsVeg] = useState(initial.isVeg ?? true);
  const [isAvailable, setIsAvailable] = useState(initial.isAvailable ?? true);
  const [formError, setFormError] = useState("");

  function submit(e) {
    e.preventDefault();
    const rupeesValue = Number(price);
    if (!name.trim()) return setFormError("Name is required");
    if (!Number.isFinite(rupeesValue) || rupeesValue <= 0) return setFormError("Enter a valid price");
    onSave({
      name: name.trim(),
      description: description.trim(),
      pricePaise: Math.round(rupeesValue * 100),
      categoryId: Number(categoryId),
      isVeg,
      isAvailable,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-lg border-2 border-orange-300 bg-orange-50 p-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Item name"
        maxLength={100}
        className="w-full rounded border p-2"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        maxLength={300}
        className="w-full rounded border p-2"
      />
      <div className="flex flex-wrap gap-2">
        <input
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Price (₹)"
          className="w-32 rounded border p-2"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded border p-2"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={isVeg} onChange={(e) => setIsVeg(e.target.checked)} />
          Vegetarian
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={isAvailable}
            onChange={(e) => setIsAvailable(e.target.checked)}
          />
          Available
        </label>
      </div>
      {formError && <p className="text-sm text-red-600">{formError}</p>}
      <div className="flex gap-2">
        <button className="rounded bg-orange-600 px-4 py-1.5 font-semibold text-white">Save</button>
        <button type="button" onClick={onCancel} className="rounded border px-4 py-1.5">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function MenuManager() {
  const { logout } = useAuth();
  const [categories, setCategories] = useState(null);
  const [editing, setEditing] = useState(null); // { item } to edit, { categoryId } to add
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState([]);
  const [newCategory, setNewCategory] = useState("");

  const fail = useCallback(
    (e) => {
      if (e.status === 401) logout();
      else setError(e.message);
    },
    [logout]
  );

  const load = useCallback(async () => {
    try {
      setCategories(await getAdminMenu());
    } catch (e) {
      fail(e);
    }
  }, [fail]);

  useEffect(() => {
    load();
  }, [load]);

  // Runs an API action, shows any warnings or errors, then reloads the list
  async function run(action) {
    setError("");
    setWarnings([]);
    try {
      const res = await action();
      setWarnings(res?.warnings ?? []);
      await load();
      return true;
    } catch (e) {
      fail(e);
      return false;
    }
  }

  async function saveItem(data) {
    const ok = await run(() =>
      editing.item ? updateItem(editing.item.id, data) : createItem(data)
    );
    if (ok) setEditing(null);
  }

  function onDeleteItem(item) {
    if (window.confirm(`Delete "${item.name}"?`)) run(() => deleteItem(item.id));
  }

  function onRenameCategory(cat) {
    const name = window.prompt("New category name", cat.name);
    if (name && name.trim() && name.trim() !== cat.name) {
      run(() => updateCategory(cat.id, { name: name.trim() }));
    }
  }

  function onDeleteCategory(cat) {
    if (window.confirm(`Delete the category "${cat.name}"?`)) run(() => deleteCategory(cat.id));
  }

  async function onAddCategory(e) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    const ok = await run(() => createCategory(newCategory.trim()));
    if (ok) setNewCategory("");
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminHeader />
      <main className="mx-auto max-w-3xl space-y-4 p-4">
        {error && <p className="rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>}
        {warnings.map((w) => (
          <p key={w} className="rounded bg-amber-100 p-2 text-sm text-amber-800">
            ⚠ {w}
          </p>
        ))}

        <form onSubmit={onAddCategory} className="flex gap-2">
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="New category name"
            maxLength={50}
            className="flex-1 rounded-lg border p-2"
          />
          <button className="rounded-lg bg-gray-900 px-4 font-semibold text-white">
            Add category
          </button>
        </form>

        {!categories ? (
          <p>Loading...</p>
        ) : (
          categories.map((cat) => (
            <section key={cat.id} className="rounded-lg bg-white p-4 shadow">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-orange-600">
                  {cat.name} <span className="text-sm text-gray-400">({cat.items.length})</span>
                </h2>
                <div className="flex gap-2 text-sm">
                  <button
                    onClick={() => setEditing({ categoryId: cat.id })}
                    className="rounded bg-orange-600 px-3 py-1 text-white"
                  >
                    + Add item
                  </button>
                  <button onClick={() => onRenameCategory(cat)} className="rounded border px-3 py-1">
                    Rename
                  </button>
                  <button
                    onClick={() => onDeleteCategory(cat)}
                    className="rounded border border-red-400 px-3 py-1 text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {editing && !editing.item && editing.categoryId === cat.id && (
                <div className="mb-3">
                  <ItemForm
                    key={`new-${cat.id}`}
                    categories={categories}
                    initial={{ categoryId: cat.id }}
                    onSave={saveItem}
                    onCancel={() => setEditing(null)}
                  />
                </div>
              )}

              {cat.items.length === 0 && !editing && (
                <p className="text-sm text-gray-500">No items in this category.</p>
              )}

              {cat.items.map((item) =>
                editing?.item?.id === item.id ? (
                  <div key={item.id} className="my-2">
                    <ItemForm
                      key={`edit-${item.id}`}
                      categories={categories}
                      initial={item}
                      onSave={saveItem}
                      onCancel={() => setEditing(null)}
                    />
                  </div>
                ) : (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b py-2"
                  >
                    <div className={item.isAvailable ? "" : "opacity-50"}>
                      <p className="flex items-center gap-2 font-medium">
                        <span
                          className={`inline-block h-3 w-3 rounded-full ${
                            item.isVeg ? "bg-green-600" : "bg-red-600"
                          }`}
                        />
                        {item.name}
                        {!item.isAvailable && (
                          <span className="rounded bg-gray-200 px-1.5 text-xs">Sold out</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">{rupees(item.pricePaise)}</p>
                    </div>
                    <div className="flex gap-2 text-sm">
                      <button
                        onClick={() => run(() => updateItem(item.id, { isAvailable: !item.isAvailable }))}
                        className={`rounded px-3 py-1 ${
                          item.isAvailable ? "bg-green-100 text-green-800" : "bg-gray-200"
                        }`}
                      >
                        {item.isAvailable ? "Available" : "Sold out"}
                      </button>
                      <button onClick={() => setEditing({ item })} className="rounded border px-3 py-1">
                        Edit
                      </button>
                      <button
                        onClick={() => onDeleteItem(item)}
                        className="rounded border border-red-400 px-3 py-1 text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              )}
            </section>
          ))
        )}
      </main>
    </div>
  );
}