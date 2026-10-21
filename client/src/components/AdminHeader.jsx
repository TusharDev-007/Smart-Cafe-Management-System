import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const linkClass = ({ isActive }) =>
  `rounded px-3 py-1 ${isActive ? "bg-orange-600 text-white" : "text-gray-300 hover:text-white"}`;

export default function AdminHeader() {
  const { user, logout } = useAuth();
  return (
    <header className="flex flex-wrap items-center justify-between gap-2 bg-gray-900 px-4 py-3 text-white print:hidden">
      <div className="flex items-center gap-2">
        <h1 className="mr-3 text-lg font-bold">Admin</h1>
        <nav className="flex gap-1 text-sm">
          <NavLink to="/admin" end className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/admin/tables" className={linkClass}>
          <NavLink to="/admin/menu" className={linkClass}>
            Menu
          </NavLink>
            Table QR codes
          </NavLink>
        </nav>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-300">{user.name}</span>
        <button onClick={logout} className="rounded bg-gray-700 px-2 py-1">
          Log out
        </button>
      </div>
    </header>
  );
}