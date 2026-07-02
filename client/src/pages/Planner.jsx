// client/src/pages/Planner.jsx
// next-semester planner. reads /api/planner, shows the suggested bundle, everything
// else you're eligible for, what's blocked (and why), and elective slots still open.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";

const GROUP_LABEL = {
  GENED: "Cơ sở ngành",
  SPEC: "Chuyên ngành",
  CAPSTONE: "Đồ án / Chuyên đề",
  SPEC_ELEC: "Tự chọn CN",
  ELEC: "Tự chọn",
};
const GROUP_BADGE = {
  GENED: "bg-success",
  SPEC: "bg-primary",
  CAPSTONE: "bg-info",
  SPEC_ELEC: "bg-secondary",
  ELEC: "bg-secondary",
};

export default function Planner() {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/planner", { credentials: "include" })
      .then((r) => {
        if (r.status === 401) { nav("/login"); return null; }
        if (!r.ok) throw new Error("Không tải được dữ liệu kế hoạch.");
        return r.json();
      })
      .then((d) => d && setData(d))
      .catch((e) => setErr(e.message));
  }, [nav]);

  const breadcrumb = [{ name: "Kế hoạch kỳ tới", icon: "fas fa-calendar-check" }];

  return (
    <AppLayout currentPage="planner" breadcrumb={breadcrumb}>
      <div className="mb-3">
        <h2 className="mb-1">
          <i className="fas fa-calendar-check text-primary me-2"></i>Kế hoạch học kỳ tới
        </h2>
        <p className="text-muted mb-0">
          Dựa trên môn đã đạt và điều kiện tiên quyết trong lộ trình{" "}
          {data && <code>{data.program}</code>}.
        </p>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}
      {!data && !err && (
        <div className="text-center text-muted py-5">
          <div className="spinner-border text-primary mb-2" role="status" />
          <div>Đang tính lộ trình…</div>
        </div>
      )}

      {data && (
        <>
          {/* suggested bundle */}
          <div className="card shadow-sm border-success mb-4">
            <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
              <span><i className="fas fa-star me-2"></i>Đề xuất đăng ký</span>
              <span className="badge bg-light text-success">
                {data.suggestedCredits} / {data.creditCap} tín chỉ
              </span>
            </div>
            <ul className="list-group list-group-flush">
              {data.suggested.length === 0 ? (
                <li className="list-group-item text-muted">
                  Không có môn nào sẵn sàng — xem mục bị khoá bên dưới.
                </li>
              ) : (
                data.suggested.map((c) => (
                  <li key={c.id} className="list-group-item d-flex align-items-center gap-2">
                    <span className="fw-bold text-primary font-monospace" style={{ minWidth: 84 }}>
                      {c.id}
                    </span>
                    <span className="flex-grow-1 text-truncate">{c.nameEg || c.name}</span>
                    <span className={`badge ${GROUP_BADGE[c.group] || "bg-secondary"}`}>
                      {GROUP_LABEL[c.group] || c.group}
                    </span>
                    <span className="text-muted small">{c.credits ?? "?"}tc</span>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="row g-4">
            {/* eligible */}
            <div className="col-md-6">
              <div className="card shadow-sm h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <span><i className="fas fa-unlock me-2 text-success"></i>Đủ điều kiện học</span>
                  <span className="badge bg-secondary">{data.eligible.length}</span>
                </div>
                <ul className="list-group list-group-flush">
                  {data.eligible.map((c) => (
                    <li key={c.id} className="list-group-item d-flex align-items-center gap-2">
                      <span className="fw-bold text-primary font-monospace" style={{ minWidth: 84 }}>
                        {c.id}
                      </span>
                      <span className="flex-grow-1 text-truncate small">{c.nameEg || c.name}</span>
                      <span className="text-muted small">{c.credits ?? "?"}tc</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* blocked */}
            <div className="col-md-6">
              <div className="card shadow-sm h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <span><i className="fas fa-lock me-2 text-warning"></i>Chưa đủ điều kiện</span>
                  <span className="badge bg-warning text-dark">{data.blocked.length}</span>
                </div>
                <ul className="list-group list-group-flush">
                  {data.blocked.map((c) => (
                    <li key={c.id} className="list-group-item">
                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-bold text-primary font-monospace" style={{ minWidth: 84 }}>
                          {c.id}
                        </span>
                        <span className="flex-grow-1 text-truncate small">{c.nameEg || c.name}</span>
                      </div>
                      <div className="small text-warning-emphasis mt-1">
                        <i className="fas fa-lock me-1"></i>
                        cần: {c.missing.join(", ")}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* electives */}
          {data.electives.some((e) => e.slotsRemaining > 0) && (
            <div className="card shadow-sm mt-4">
              <div className="card-header">
                <i className="fas fa-list-check me-2"></i>Môn tự chọn còn thiếu
              </div>
              <div className="card-body">
                {data.electives
                  .filter((e) => e.slotsRemaining > 0)
                  .map((e) => (
                    <div key={e.group} className="mb-3">
                      <div className="d-flex justify-content-between mb-1">
                        <strong>{e.group}</strong>
                        <span className="text-muted small">
                          còn {e.slotsRemaining}/{e.slotsRequired} suất
                        </span>
                      </div>
                      <div className="d-flex flex-wrap gap-1">
                        {e.openOptions.slice(0, 10).map((o) => (
                          <span
                            key={o.id}
                            className="badge bg-light text-dark border font-monospace"
                            title={o.nameEg || o.name}
                          >
                            {o.id}
                          </span>
                        ))}
                        {e.openOptions.length > 10 && (
                          <span className="badge bg-light text-muted border">
                            +{e.openOptions.length - 10}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}