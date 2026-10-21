import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ roles, loginPath, children }) {
  const { user, logout } = useAuth();
  if (!user) return <Navigate to={loginPath} replace />;
  if (!roles.includes(user.role)) {
    return (
      <div className="p-4">
        <p className="text-red-600">Your account does not have access to this page.</p>
        <button onClick={logout} className="mt-3 rounded bg-gray-800 px-3 py-1 text-white">
          Log out
        </button>
      </div>
    );
  }
  return children;
}