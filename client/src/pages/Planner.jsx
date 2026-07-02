// client/src/pages/Planner.jsx
// next-semester planner. reads /api/planner, shows the suggested bundle,
// everything else you're eligible for, what's blocked (and why), and elective slots.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Planner.css";

const GROUP_LABEL = {
  GENED: "Cơ sở ngành",
  SPEC: "Chuyên ngành",
  CAPSTONE: "Đồ án / Chuyên đề",
  SPEC_ELEC: "Tự chọn chuyên ngành",
  ELEC: "Tự chọn",
};

export default function Planner() {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/planner", { credentials: "include" })
      .then((r) => {
        if (r.status === 401) { nav("/login"); return null; }
        if (!r.ok) throw new Error("Không tải được dữ liệu");
        return r.json();
      })
      .then((d) => d && setData(d))
      .catch((e) => setErr(e.message));
  }, [nav]);

  if (err) return <div className="pl-wrap"><p className="pl-error">{err}</p></div>;
  if (!data) return <div className="pl-wrap"><p className="pl-muted">Đang tính lộ trình…</p></div>;

  const { suggested, suggestedCredits, creditCap, eligible, blocked, electives } = data;

  return (
    <div className="pl-wrap">
      <header className="pl-head">
        <h1>Kế hoạch học kỳ tới</h1>
        <p className="pl-muted">
          Dựa trên môn đã đạt và điều kiện tiên quyết trong lộ trình{" "}
          <code>{data.program}</code>.
        </p>
      </header>

      {/* suggested bundle */}
      <section className="pl-card pl-suggest">
        <div className="pl-card-head">
          <h2>Đề xuất đăng ký</h2>
          <span className="pl-badge">
            {suggestedCredits} / {creditCap} tín chỉ
          </span>
        </div>
        {suggested.length === 0 ? (
          <p className="pl-muted">Không có môn nào sẵn sàng — kiểm tra mục bị khoá bên dưới.</p>
        ) : (
          <ul className="pl-list">
            {suggested.map((c) => (
              <li key={c.id} className="pl-row pl-row-pick">
                <span className="pl-code">{c.id}</span>
                <span className="pl-name">{c.nameEg || c.name}</span>
                <span className={`pl-tag pl-tag-${c.group}`}>{GROUP_LABEL[c.group] || c.group}</span>
                <span className="pl-cr">{c.credits ?? "?"}tc</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="pl-grid">
        {/* all eligible */}
        <section className="pl-card">
          <div className="pl-card-head">
            <h2>Đủ điều kiện học</h2>
            <span className="pl-badge">{eligible.length}</span>
          </div>
          <ul className="pl-list">
            {eligible.map((c) => (
              <li key={c.id} className="pl-row">
                <span className="pl-code">{c.id}</span>
                <span className="pl-name">{c.nameEg || c.name}</span>
                <span className="pl-cr">{c.credits ?? "?"}tc</span>
              </li>
            ))}
          </ul>
        </section>

        {/* blocked */}
        <section className="pl-card">
          <div className="pl-card-head">
            <h2>Chưa đủ điều kiện</h2>
            <span className="pl-badge pl-badge-warn">{blocked.length}</span>
          </div>
          <ul className="pl-list">
            {blocked.map((c) => (
              <li key={c.id} className="pl-row pl-row-block">
                <span className="pl-code">{c.id}</span>
                <span className="pl-name">{c.nameEg || c.name}</span>
                <span className="pl-missing">
                  cần: {c.missing.join(", ")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* electives */}
      {electives.some((e) => e.slotsRemaining > 0) && (
        <section className="pl-card">
          <div className="pl-card-head"><h2>Môn tự chọn còn thiếu</h2></div>
          {electives
            .filter((e) => e.slotsRemaining > 0)
            .map((e) => (
              <div key={e.group} className="pl-elec">
                <div className="pl-elec-head">
                  <strong>{e.group}</strong>
                  <span className="pl-muted">
                    còn {e.slotsRemaining}/{e.slotsRequired} suất
                  </span>
                </div>
                <div className="pl-elec-opts">
                  {e.openOptions.slice(0, 8).map((o) => (
                    <span key={o.id} className="pl-chip" title={o.nameEg || o.name}>
                      {o.id}
                    </span>
                  ))}
                  {e.openOptions.length > 8 && (
                    <span className="pl-chip pl-chip-more">+{e.openOptions.length - 8}</span>
                  )}
                </div>
              </div>
            ))}
        </section>
      )}
    </div>
  );
}