import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { page: "dashboard", to: "/dashboard", icon: "fa-tachometer-alt", label: "Dashboard" },
  { page: "grades", to: "/grades", icon: "fa-chart-line", label: "Xem điểm" },
  { page: "planner", to: "/planner", icon: "fa-calendar-check", label: "Kế hoạch" },
  { page: "audit", to: "/audit", icon: "fa-clipboard-check", label: "Tốt nghiệp" },
  { page: "flowchart", to: "/flowchart", icon: "fa-diagram-project", label: "Xem lộ trình" },
  { page: "advisor", to: "/advisor", icon: "fa-robot", label: "Tư vấn AI" },
  { page: "chat", to: "/chat", icon: "fa-comment", label: "Nhắn tin" },
  { page: "manageFlow", to: "/manageFlow", icon: "fa-cogs", label: "Sửa lộ trình" },
];

// Ported from layout.ejs + partials/{navigation,breadcrumb,footer}.ejs
export default function AppLayout({ currentPage, breadcrumb = [], children }) {
  const { student, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout(e) {
    e.preventDefault();
    await logout();
    navigate("/login");
  }

  return (
    <>
      <nav className="navbar navbar-expand-xxl navbar-dark bg-primary">
        <div className="container">
          <div className="d-flex align-items-center flex-nowrap">
            <button
              className="navbar-toggler btn-sm py-1 px-1 me-2"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarNav"
            >
              <span className="navbar-toggler-icon"></span>
            </button>
            <Link className="navbar-brand" to="/dashboard">
              <i className="fas fa-graduation-cap me-2"></i>Smart Learning Advisor
            </Link>
          </div>

          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto">
              {NAV.map((item) => (
                <li className="nav-item" key={item.page}>
                  <Link
                    className={`nav-link text-nowrap ${currentPage === item.page ? "active" : ""}`}
                    to={item.to}
                  >
                    <i className={`fas ${item.icon} me-1`}></i>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            <ul className="navbar-nav">
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle"
                  href="#"
                  id="navbarDropdown"
                  role="button"
                  data-bs-toggle="dropdown"
                >
                  <i className="fas fa-user me-1"></i>
                  {student?.name}
                </a>
                <ul className="dropdown-menu dropdown-menu-end">
                  <li>
                    <a className="dropdown-item" href="/logout" onClick={handleLogout}>
                      <i className="fas fa-sign-out-alt me-2"></i>Đăng xuất
                    </a>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <main className="container py-4">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item">
              <Link to="/dashboard">
                <i className="fas fa-home me-1"></i>Trang chủ
              </Link>
            </li>
            {breadcrumb.map((item, i) => (
              <li
                key={i}
                className={`breadcrumb-item ${i === breadcrumb.length - 1 ? "active" : ""}`}
                aria-current={i === breadcrumb.length - 1 ? "page" : undefined}
              >
                {item.icon && <i className={`${item.icon} me-1`}></i>}
                {item.name}
              </li>
            ))}
          </ol>
        </nav>

        {children}
      </main>

      <footer className="bg-light py-4 mt-5">
        <div className="container">
          <div className="row">
            <div className="col-md-6">
              <h6>
                <i className="fas fa-graduation-cap me-2"></i>Smart Learning Advisor
              </h6>
              <p className="text-muted mb-0">
                Hệ thống tư vấn học tập thông minh cho sinh viên EIU
              </p>
            </div>
            <div className="col-md-6 text-md-end">
              <small className="text-muted">
                © {new Date().getFullYear()} EIU Smart Learning Advisor
              </small>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}