// client/src/pages/Audit.jsx
// degree audit / graduation progress. reads /api/audit, shows overall progress,
// per-category breakdown, GPA, projected terms left, and a live GPA-target calc.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Audit.css";

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
        if (!r.ok) throw new Error("Không tải được dữ liệu");
        return r.json();
      })
      .then((d) => d && setData(d))
      .catch((e) => setErr(e.message));
  }, [nav]);

  // GPA needed on remaining credits to hit the target:
  //   requiredAvg = (target*(done+remaining) - qualityPoints) / remaining
  const calc = useMemo(() => {
    if (!data || !data.gpaCredits) return null;
    const remaining = data.creditsRemaining || 0;
    if (remaining <= 0) return { done: true };
    const total = data.gpaCredits + remaining;
    const need = (target * total - data.qualityPoints) / remaining;
    return { need: +need.toFixed(2), feasible: need <= 4.0, remaining };
  }, [data, target]);

  if (err) return <div className="au-wrap"><p className="au-error">{err}</p></div>;
  if (!data) return <div className="au-wrap"><p className="au-muted">Đang kiểm tra tiến độ…</p></div>;

  return (
    <div className="au-wrap">
      <header className="au-head">
        <h1>Tiến độ tốt nghiệp</h1>
        <p className="au-muted">Lộ trình <code>{data.program}</code></p>
      </header>

      {/* top stats */}
      <section className="au-stats">
        <div className="au-ring" style={{ "--pct": data.pctComplete }}>
          <span className="au-ring-num">{data.pctComplete}%</span>
          <span className="au-ring-lbl">hoàn thành</span>
        </div>
        <div className="au-kpis">
          <Kpi label="Tín chỉ tích luỹ" value={`${data.creditsDone}/${data.creditsRequired}`} />
          <Kpi label="Tín chỉ còn lại" value={data.creditsRemaining} />
          <Kpi label="GPA hiện tại" value={data.gpa ?? "—"} accent />
          <Kpi label="Học kỳ còn lại (ước tính)" value={data.termsLeft} />
        </div>
      </section>

      {/* per-category progress */}
      <section className="au-card">
        <h2>Tiến độ theo nhóm môn</h2>
        {data.categories.map((c) => {
          const pct = c.creditsRequired ? Math.round((c.creditsDone / c.creditsRequired) * 100) : 0;
          return (
            <div key={c.group} className="au-cat">
              <div className="au-cat-top">
                <span className="au-cat-name">{GROUP_LABEL[c.group] || c.group}</span>
                <span className="au-cat-num">
                  {c.coursesDone}/{c.coursesRequired} môn · {c.creditsDone}/{c.creditsRequired}tc
                </span>
              </div>
              <div className="au-bar"><div className="au-bar-fill" style={{ width: pct + "%" }} /></div>
            </div>
          );
        })}
      </section>

      {/* GPA target calculator */}
      <section className="au-card">
        <h2>Máy tính GPA mục tiêu</h2>
        <div className="au-calc">
          <label>
            GPA mục tiêu
            <input
              type="number" min="0" max="4" step="0.1" value={target}
              onChange={(e) => setTarget(parseFloat(e.target.value) || 0)}
            />
          </label>
          {calc?.done ? (
            <p className="au-muted">Bạn đã hoàn thành toàn bộ tín chỉ.</p>
          ) : calc ? (
            <p className={`au-calc-out ${calc.feasible ? "" : "au-calc-bad"}`}>
              Cần đạt trung bình <strong>{calc.need}</strong> trên {calc.remaining} tín chỉ còn lại
              {calc.feasible ? "" : " — vượt quá 4.0, không khả thi."}
            </p>
          ) : (
            <p className="au-muted">Chưa đủ dữ liệu điểm để tính.</p>
          )}
        </div>
      </section>

      {/* remaining required courses */}
      <section className="au-card">
        <h2>Môn bắt buộc còn lại</h2>
        <div className="au-remain">
          {data.categories.flatMap((c) => c.remaining || []).length === 0 ? (
            <p className="au-muted">Không còn môn bắt buộc nào.</p>
          ) : (
            data.categories.flatMap((c) => c.remaining || []).map((r) => (
              <span key={r.id} className="au-chip" title={r.nameEg || r.name}>
                {r.id}
              </span>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, accent }) {
  return (
    <div className="au-kpi">
      <span className={`au-kpi-val ${accent ? "au-kpi-accent" : ""}`}>{value}</span>
      <span className="au-kpi-lbl">{label}</span>
    </div>
  );
}