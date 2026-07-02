import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";

// Ported to match the student /dashboard route data:
// { student, totalCourses, completedCourses, averageScore }
export default function Dashboard() {
  const { student } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/dashboard")
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <AppLayout
      currentPage="dashboard"
      breadcrumb={[{ name: "Dashboard", icon: "fas fa-tachometer-alt" }]}
    >
      {/* Welcome banner */}
      <div className="card bg-gradient-primary text-white mb-4 shadow-sm border-0">
        <div className="card-body d-flex justify-content-between align-items-center">
          <div>
            <h4 className="mb-1">Xin chào, {student?.name}!</h4>
            <p className="mb-0">
              Chào mừng bạn đến với Hệ thống Cố vấn học tập EIU
            </p>
          </div>
          <div>
            <i className="fas fa-user-graduate fa-3x"></i>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Quick stats */}
      <div className="row text-center">
        <StatCard icon="fa-book" color="text-primary" label="Tổng môn học" value={stats?.totalCourses} />
        <StatCard icon="fa-check-circle" color="text-success" label="Đã hoàn thành" value={stats?.completedCourses} />
        <StatCard
          icon="fa-chart-line"
          color="text-warning"
          label="Điểm trung bình"
          value={stats ? Number(stats.averageScore).toFixed(2) : undefined}
        />
        <StatCard icon="fa-id-card" color="text-info" label="Mã sinh viên" value={student?.id} />
      </div>

      {/* Info + quick actions */}
      <div className="row">
        <div className="col-md-6 d-flex">
          <div className="card flex-fill shadow-sm border-0">
            <div className="card-header bg-light fw-bold">
              <i className="fas fa-user me-2"></i> Thông tin sinh viên
            </div>
            <div className="card-body">
              <p className="mb-2"><strong>Họ tên:</strong> {student?.name}</p>
              <p className="mb-2"><strong>Mã số:</strong> {student?.id}</p>
              <p className="mb-0"><strong>Vai trò:</strong> Sinh viên</p>
            </div>
          </div>
        </div>

        <div className="col-md-6 d-flex">
          <div className="card flex-fill shadow-sm border-0">
            <div className="card-header bg-light fw-bold">
              <i className="fas fa-bolt me-2"></i> Hành động nhanh
            </div>
            <div className="card-body">
              <div className="d-grid gap-3">
                <Link to="/grades" className="btn btn-outline-primary text-start">
                  <i className="fas fa-chart-line me-2"></i> Xem bảng điểm
                </Link>
                <Link to="/flowchart" className="btn btn-outline-info text-start">
                  <i className="fas fa-diagram-project me-2"></i> Xem lộ trình môn học
                </Link>
                <Link to="/advisor" className="btn btn-outline-success text-start">
                  <i className="fas fa-robot me-2"></i> Nhận tư vấn AI
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({ icon, color, label, value }) {
  return (
    <div className="col-md-3 mb-3 d-flex">
      <div className="card flex-fill shadow-sm border-0">
        <div className="card-body d-flex flex-column justify-content-around">
          <i className={`fas ${icon} fa-2x ${color} mb-2`}></i>
          <h6 className="fw-bold">{label}</h6>
          <h5>{value ?? "--"}</h5>
        </div>
      </div>
    </div>
  );
}
