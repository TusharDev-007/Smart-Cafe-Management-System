
import { useEffect, useState } from "react";
import AdminHeader from "../../components/AdminHeader";
import {
  getStaff,
  createStaff,
  updateStaff,
} from "../../api/http";

const initialForm = {
  name: "",
  email: "",
  password: "",
  role: "CASHIER",
};

export default function StaffManager() {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadStaff() {
    try {
      setError("");
      const data = await getStaff();
      setStaff(data);
    } catch (err) {
      setError(err.message || "Unable to load staff");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStaff();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      await createStaff(form);
      setForm(initialForm);
      setMessage("Staff member created successfully.");
      await loadStaff();
    } catch (err) {
      setError(err.message || "Unable to create staff member");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id, patch) {
    setError("");
    setMessage("");

    try {
      await updateStaff(id, patch);
      setMessage("Staff details updated successfully.");
      await loadStaff();
    } catch (err) {
      setError(err.message || "Unable to update staff member");
    }
  }

  async function handlePasswordReset(member) {
    const password = window.prompt(
      `Enter a new password for ${member.name} (minimum 8 characters):`
    );

    if (password === null) return;

    if (password.length < 8 || password.length > 100) {
      setError("Password must contain 8 to 100 characters.");
      return;
    }

    await handleUpdate(member.id, { password });
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminHeader />

      <main className="mx-auto max-w-6xl space-y-6 p-4">
        <h2 className="text-2xl font-bold text-gray-800">
          Staff Management
        </h2>

        {error && (
          <div className="rounded bg-red-100 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded bg-green-100 p-3 text-sm text-green-700">
            {message}
          </div>
        )}

        <section className="rounded-lg bg-white p-5 shadow">
          <h3 className="mb-4 text-lg font-semibold">Add Staff Member</h3>

          <form
            onSubmit={handleCreate}
            className="grid gap-3 sm:grid-cols-2"
          >
            <input
              className="rounded border p-2"
              placeholder="Full name"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              required
              minLength={2}
              maxLength={60}
            />

            <input
              className="rounded border p-2"
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
              required
            />

            <input
              className="rounded border p-2"
              type="password"
              placeholder="Temporary password (minimum 8 characters)"
              value={form.password}
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
              required
              minLength={8}
              maxLength={100}
            />

            <select
              className="rounded border p-2"
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value })
              }
            >
              <option value="CASHIER">Cashier</option>
              <option value="KITCHEN">Kitchen</option>
              <option value="ADMIN">Admin</option>
            </select>

            <button
              disabled={saving}
              className="rounded bg-orange-600 px-4 py-2 font-semibold text-white hover:bg-orange-700 disabled:opacity-50 sm:col-span-2"
            >
              {saving ? "Creating..." : "Create Staff Account"}
            </button>
          </form>
        </section>

        <section className="rounded-lg bg-white p-5 shadow">
          <h3 className="mb-4 text-lg font-semibold">Staff Accounts</h3>

          {loading ? (
            <p>Loading staff accounts...</p>
          ) : staff.length === 0 ? (
            <p className="text-gray-500">No staff accounts found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3">Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {staff.map((member) => (
                    <tr key={member.id} className="border-b">
                      <td className="p-3 font-medium">{member.name}</td>
                      <td className="p-3">{member.email}</td>

                      <td className="p-3">
                        <select
                          className="rounded border p-1"
                          value={member.role}
                          onChange={(e) =>
                            handleUpdate(member.id, {
                              role: e.target.value,
                            })
                          }
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="KITCHEN">Kitchen</option>
                          <option value="CASHIER">Cashier</option>
                        </select>
                      </td>

                      <td className="p-3">
                        <span
                          className={
                            member.isActive
                              ? "font-semibold text-green-700"
                              : "font-semibold text-red-600"
                          }
                        >
                          {member.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="space-x-2 p-3">
                        <button
                          onClick={() =>
                            handleUpdate(member.id, {
                              isActive: !member.isActive,
                            })
                          }
                          className="rounded bg-gray-800 px-2 py-1 text-white"
                        >
                          {member.isActive ? "Deactivate" : "Activate"}
                        </button>

                        <button
                          onClick={() => handlePasswordReset(member)}
                          className="rounded bg-orange-600 px-2 py-1 text-white"
                        >
                          Reset Password
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
