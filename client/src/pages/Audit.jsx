// client/src/pages/Audit.jsx
// degree audit / graduation progress. reads /api/audit: overall progress,
// per-category breakdown, GPA, projected terms left, and a live GPA-target calc.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";

const GROUP_LABEL = {
  GENED: "Cơ sở ngành",
  SPEC: "Chuyên ngành",
  CAPSTONE: "Đồ án / Chuyên đề",
  ELECTIVE: "Tự chọn",
  OTHER: "Khác",
};

export default function Audit() {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [target, setTarget] = useState(3.2);

  useEffect(() => {
    fetch("/api/audit", { credentials: "include" })
      .then((r) => {
        if (r.status === 401) { nav("/login"); return null; }
        if (!r.ok) throw new Error("Không tải được dữ liệu tiến độ.");
        return r.json();
      })
      .then((d) => d && setData(d))
      .catch((e) => setErr(e.message));
  }, [nav]);

  // GPA needed on remaining credits to hit the target:
  //   need = (target*(gpaCredits+remaining) - qualityPoints) / remaining
  const calc = useMemo(() => {
    if (!data || !data.gpaCredits) return null;
    const remaining = data.creditsRemaining || 0;
    if (remaining <= 0) return { done: true };
    const total = data.gpaCredits + remaining;
    const need = (target * total - data.qualityPoints) / remaining;
    return { need: +need.toFixed(2), feasible: need <= 4.0, remaining };
  }, [data, target]);

  const breadcrumb = [{ name: "Tiến độ tốt nghiệp", icon: "fas fa-clipboard-check" }];

  return (
    <AppLayout currentPage="audit" breadcrumb={breadcrumb}>
      <div className="mb-3">
        <h2 className="mb-1">
          <i className="fas fa-clipboard-check text-primary me-2"></i>Tiến độ tốt nghiệp
        </h2>
        <p className="text-muted mb-0">Lộ trình {data && <code>{data.program}</code>}</p>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}
      {!data && !err && (
        <div className="text-center text-muted py-5">
          <div className="spinner-border text-primary mb-2" role="status" />
          <div>Đang kiểm tra tiến độ…</div>
        </div>
      )}

      {data && (
        <>
          {/* overall progress */}
          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-end mb-2">
                <h5 className="mb-0">Hoàn thành chương trình</h5>
                <span className="display-6 fw-bold text-primary">{data.pctComplete}%</span>
              </div>
              <div className="progress" style={{ height: 14 }}>
                <div
                  className="progress-bar bg-success"
                  role="progressbar"
                  style={{ width: data.pctComplete + "%" }}
                  aria-valuenow={data.pctComplete}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
          </div>

          {/* KPI cards */}
          <div className="row g-3 mb-4">
            <Kpi icon="fa-coins" label="Tín chỉ tích luỹ" value={`${data.creditsDone}/${data.creditsRequired}`} />
            <Kpi icon="fa-hourglass-half" label="Tín chỉ còn lại" value={data.creditsRemaining} />
            <Kpi icon="fa-star" label="GPA hiện tại" value={data.gpa ?? "—"} accent />
            <Kpi icon="fa-calendar-days" label="Học kỳ còn lại (ước tính)" value={data.termsLeft} />
          </div>

          {/* per-category progress */}
          <div className="card shadow-sm mb-4">
            <div className="card-header"><i className="fas fa-layer-group me-2"></i>Tiến độ theo nhóm môn</div>
            <div className="card-body">
              {data.categories.map((c) => {
                const pct = c.creditsRequired ? Math.round((c.creditsDone / c.creditsRequired) * 100) : 0;
                return (
                  <div key={c.group} className="mb-3">
                    <div className="d-flex justify-content-between small mb-1">
                      <span className="fw-semibold">{GROUP_LABEL[c.group] || c.group}</span>
                      <span className="text-muted">
                        {c.coursesDone}/{c.coursesRequired} môn · {c.creditsDone}/{c.creditsRequired}tc
                      </span>
                    </div>
                    <div className="progress" style={{ height: 8 }}>
                      <div className="progress-bar bg-primary" style={{ width: pct + "%" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* GPA target calculator */}
          <div className="card shadow-sm mb-4">
            <div className="card-header"><i className="fas fa-calculator me-2"></i>Máy tính GPA mục tiêu</div>
            <div className="card-body">
              <div className="row align-items-center g-3">
                <div className="col-auto">
                  <label className="form-label small text-muted mb-1">GPA mục tiêu</label>
                  <input
                    type="number" min="0" max="4" step="0.1" value={target}
                    className="form-control" style={{ width: 110 }}
                    onChange={(e) => setTarget(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="col">
                  {calc?.done ? (
                    <p className="mb-0 text-muted">Bạn đã hoàn thành toàn bộ tín chỉ.</p>
                  ) : calc ? (
                    <p className={`mb-0 ${calc.feasible ? "" : "text-danger"}`}>
                      Cần đạt trung bình{" "}
                      <strong className={calc.feasible ? "text-success" : "text-danger"}>{calc.need}</strong>{" "}
                      trên {calc.remaining} tín chỉ còn lại
                      {calc.feasible ? "." : " — vượt quá 4.0, không khả thi."}
                    </p>
                  ) : (
                    <p className="mb-0 text-muted">Chưa đủ dữ liệu điểm để tính.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* remaining required courses */}
          <div className="card shadow-sm">
            <div className="card-header"><i className="fas fa-list me-2"></i>Môn bắt buộc còn lại</div>
            <div className="card-body d-flex flex-wrap gap-1">
              {data.categories.flatMap((c) => c.remaining || []).length === 0 ? (
                <span className="text-muted">Không còn môn bắt buộc nào.</span>
              ) : (
                data.categories
                  .flatMap((c) => c.remaining || [])
                  .map((r) => (
                    <span
                      key={r.id}
                      className="badge bg-light text-dark border font-monospace"
                      title={r.nameEg || r.name}
                    >
                      {r.id}
                    </span>
                  ))
              )}
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}

function Kpi({ icon, label, value, accent }) {
  return (
    <div className="col-6 col-lg-3">
      <div className="card shadow-sm h-100">
        <div className="card-body py-3">
          <div className={`h4 mb-0 fw-bold ${accent ? "text-success" : ""}`}>
            <i className={`fas ${icon} text-muted me-2 fs-6`}></i>{value}
          </div>
          <div className="small text-muted mt-1">{label}</div>
        </div>
      </div>
    </div>
  );
}