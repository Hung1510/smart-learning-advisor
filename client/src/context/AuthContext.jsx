import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  // On first load, ask the backend who we are (verifies the JWT cookie).
  useEffect(() => {
    api
      .get("/me")
      .then((data) => setStudent(data.student))
      .catch(() => setStudent(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(studentId, password) {
    const data = await api.post("/login", { studentId, password });
    setStudent(data.student);
    return data.student;
  }

  async function logout() {
    await api.post("/logout");
    setStudent(null);
  }

  return (
    <AuthContext.Provider value={{ student, loading, login, logout, setStudent }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
