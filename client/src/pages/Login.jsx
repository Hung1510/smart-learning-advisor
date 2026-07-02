import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(studentId.trim(), password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Đăng nhập thất bại");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div className="card shadow-sm border-0" style={{ maxWidth: 420, width: "100%" }}>
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <h1 className="h4 fw-bold mb-1">Smart Learning Advisor</h1>
            <p className="text-muted small mb-0">
              Hệ thống tư vấn học tập thông minh cho sinh viên EIU
            </p>
          </div>

          <h2 className="h6 fw-semibold mb-3">Đăng nhập</h2>

          {error && (
            <div className="alert alert-danger py-2 small" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label small">ID Sinh viên</label>
              <input
                type="text"
                className="form-control"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label small">Mật khẩu</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={busy}
            >
              {busy ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          <div className="text-center text-muted small my-3">hoặc</div>

          <a href="/auth/google" className="btn btn-outline-secondary w-100">
            <i className="fab fa-google me-2"></i>
            Đăng nhập bằng Google (EIU)
          </a>

          <p className="text-center text-muted small mt-4 mb-0">
            © {new Date().getFullYear()} EIU Smart Learning Advisor
          </p>
        </div>
      </div>
    </div>
  );
}
