import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Gate for authenticated screens. While we check the cookie, show nothing;
// if not logged in, bounce to /login.
export default function ProtectedRoute({ children }) {
  const { student, loading } = useAuth();
  if (loading) return null; // could render a spinner here
  if (!student) return <Navigate to="/login" replace />;
  return children;
}
