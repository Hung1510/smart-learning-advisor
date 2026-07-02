import { useEffect, useRef, useState } from "react";
import AppLayout from "../components/AppLayout";
import { formatAdvice } from "../lib/formatAdvice";

const SAMPLES = [
  {
    group: "Về học tập:",
    items: [
      { label: '"Làm thế nào để cải thiện GPA?"', question: "Làm thế nào để cải thiện GPA của tôi?", goals: "Đạt GPA > 3.5 trong học kỳ tới", difficulties: "Điểm các môn toán và lập trình thấp" },
      { label: '"Nên ưu tiên môn nào?"', question: "Tôi nên tập trung vào môn nào để có hiệu quả cao nhất?", goals: "Tối ưu hóa thời gian học tập", difficulties: "Có quá nhiều môn học cùng lúc" },
    ],
  },
  {
    group: "Về tương lai:",
    items: [
      { label: '"Chuẩn bị cho tương lai nghề nghiệp?"', question: "Tôi nên chuẩn bị gì để tìm được công việc tốt sau khi tốt nghiệp?", goals: "Tìm được công việc trong lĩnh vực công nghệ", difficulties: "Chưa có kinh nghiệm thực tế" },
      { label: '"Có nên đi thực tập?"', question: "Có nên tham gia thực tập trong thời gian học không?", goals: "Tích lũy kinh nghiệm thực tế", difficulties: "Lo lắng về ảnh hưởng đến học tập" },
    ],
  },
];

export default function Advisor() {
  const [form, setForm] = useState({ question: "", goals: "", difficulties: "" });
  const [busy, setBusy] = useState(false);
  const [streamText, setStreamText] = useState(""); // live tokens
  const [finalHtml, setFinalHtml] = useState(""); // formatted result
  const [errorMsg, setErrorMsg] = useState("");
  const responseRef = useRef(null);

  // Pre-fill if arriving from the flowchart (server tells us via /api/advisor/context)
  useEffect(() => {
    fetch("/api/advisor/context", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.dataFlow?.length) {
          setForm({ question: d.dataFlow[0] || "", goals: d.dataFlow[1] || "", difficulties: d.dataFlow[2] || "" });
        }
      })
      .catch(() => {});
  }, []);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErrorMsg("");
    setFinalHtml("");
    setStreamText("");
    setTimeout(() => responseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        // prompt context is built server-side now — client only sends these three
        body: JSON.stringify(form),
      });

      if (!res.ok || !res.body) throw new Error("stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let lineBuffer = "";
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop();

        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data: ")) continue;
          const payload = t.slice(6).trim();
          if (!payload || payload === "[DONE]") continue;

          try {
            const parsed = JSON.parse(payload);
            if (typeof parsed.token === "string" && parsed.token.length > 0) {
              textBuffer += parsed.token;
              setStreamText(textBuffer);
            }
            if (parsed.done) setFinalHtml(formatAdvice(parsed.fullText));
            if (parsed.error) setErrorMsg(parsed.fallback || "Có lỗi xảy ra.");
          } catch {
            /* ignore malformed chunk */
          }
        }
      }
    } catch (err) {
      setErrorMsg("Có lỗi xảy ra khi xử lý yêu cầu. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppLayout currentPage="advisor" breadcrumb={[{ name: "Tư vấn AI", icon: "fas fa-robot" }]}>
      <style>{ADVICE_CSS}</style>

      <div className="row mb-4">
        <div className="col-12">
          <div className="text-center">
            <div className="ai-icon-container mb-3">
              <i className="fas fa-robot fa-4x text-primary"></i>
            </div>
            <h2>Tư vấn học tập cá nhân hóa bằng AI</h2>
            <p className="text-muted">Nhận lời khuyên về lộ trình học tập dựa trên kết quả học tập của bạn</p>
          </div>
        </div>
      </div>

      <div className="row">
        {/* form */}
        <div className="col-lg-6 mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-gradient-primary text-white">
              <h5 className="mb-0"><i className="fas fa-comments me-2"></i>Chia sẻ thông tin với AI</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label"><i className="fas fa-question-circle me-1"></i>Câu hỏi hoặc vấn đề bạn muốn tư vấn:</label>
                  <textarea className="form-control" rows="3" value={form.question}
                    onChange={(e) => set("question", e.target.value)}
                    placeholder="Ví dụ: Tôi muốn cải thiện điểm số, làm thế nào để học hiệu quả hơn?" />
                </div>
                <div className="mb-3">
                  <label className="form-label"><i className="fas fa-bullseye me-1"></i>Mục tiêu học tập của bạn:</label>
                  <textarea className="form-control" rows="2" value={form.goals}
                    onChange={(e) => set("goals", e.target.value)}
                    placeholder="Ví dụ: Muốn đạt GPA > 3.5, tìm thực tập, học thêm kỹ năng mới..." />
                </div>
                <div className="mb-3">
                  <label className="form-label"><i className="fas fa-exclamation-triangle me-1"></i>Khó khăn bạn đang gặp phải:</label>
                  <textarea className="form-control" rows="2" value={form.difficulties}
                    onChange={(e) => set("difficulties", e.target.value)}
                    placeholder="Ví dụ: Khó khăn trong môn Toán, quản lý thời gian, thiếu động lực..." />
                </div>
                <button type="submit" className="btn btn-primary w-100" disabled={busy}>
                  {busy ? (
                    <><i className="fas fa-spinner fa-spin me-2"></i>Đang xử lý...</>
                  ) : (
                    <><i className="fas fa-paper-plane me-2"></i>Nhận tư vấn từ AI</>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="card border-0 shadow-sm mt-4">
            <div className="card-header bg-info text-white">
              <h6 className="mb-0"><i className="fas fa-lightbulb me-2"></i>Mẹo sử dụng hiệu quả</h6>
            </div>
            <div className="card-body">
              <ul className="list-unstyled mb-0">
                <li className="mb-2"><i className="fas fa-check-circle text-success me-2"></i>Mô tả cụ thể tình huống của bạn</li>
                <li className="mb-2"><i className="fas fa-check-circle text-success me-2"></i>Chia sẻ mục tiêu ngắn hạn và dài hạn</li>
                <li className="mb-2"><i className="fas fa-check-circle text-success me-2"></i>Nêu rõ những khó khăn đang gặp phải</li>
                <li><i className="fas fa-check-circle text-success me-2"></i>AI sẽ phân tích dựa trên kết quả học tập thực tế</li>
              </ul>
            </div>
          </div>
        </div>

        {/* response */}
        <div className="col-lg-6" ref={responseRef}>
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-gradient-success text-white">
              <h5 className="mb-0"><i className="fas fa-magic me-2"></i>Lời khuyên từ AI</h5>
            </div>
            <div className="card-body">
              {errorMsg ? (
                <div className="alert alert-danger" role="alert">
                  <i className="fas fa-exclamation-triangle me-2"></i>{errorMsg}
                </div>
              ) : finalHtml ? (
                <div dangerouslySetInnerHTML={{ __html: finalHtml }} />
              ) : busy || streamText ? (
                <div className="ai-advice-content">
                  <div className="d-flex align-items-center mb-3">
                    <i className="fas fa-robot text-primary me-2"></i>
                    <h6 className="mb-0 text-primary">
                      AI đang trả lời
                      <span id="typingDots"><span className="dot">.</span><span className="dot">.</span><span className="dot">.</span></span>
                    </h6>
                  </div>
                  <div className="advice-text">{streamText}</div>
                </div>
              ) : (
                <div className="text-center text-muted py-5">
                  <i className="fas fa-robot fa-3x mb-3 opacity-50"></i>
                  <p>Vui lòng điền thông tin bên trái để nhận tư vấn từ AI</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* sample questions */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-warning text-dark">
              <h6 className="mb-0"><i className="fas fa-question-circle me-2"></i>Câu hỏi mẫu</h6>
            </div>
            <div className="card-body">
              <div className="row">
                {SAMPLES.map((col) => (
                  <div className="col-md-6" key={col.group}>
                    <h6>{col.group}</h6>
                    <ul className="list-unstyled">
                      {col.items.map((s) => (
                        <li className="mb-2" key={s.label}>
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm sample-question"
                            onClick={() => setForm({ question: s.question, goals: s.goals, difficulties: s.difficulties })}
                          >
                            {s.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// ported from the <style> block injected by advisor.js
const ADVICE_CSS = `
@keyframes blink { 0%,80%,100%{opacity:0} 40%{opacity:1} }
.dot { animation: blink 1.4s infinite both; }
.dot:nth-child(2){animation-delay:.2s}
.dot:nth-child(3){animation-delay:.4s}
.advice-text { line-height:1.8; color:#333; white-space:pre-wrap; }
.advice-text h6 { margin-top:1.5rem; margin-bottom:.5rem; padding-bottom:.25rem; border-bottom:2px solid #e9ecef; white-space:normal; }
.advice-text .ms-3 { padding-left:1rem; margin-bottom:.5rem; white-space:normal; }
.advice-text span, .advice-text table { white-space:normal; }
.table-responsive { width:100%; overflow-x:auto; overflow-y:visible; }
.advice-text table { width:100%; border-collapse:collapse; table-layout:auto; white-space:normal!important; margin-bottom:1rem; }
.advice-text th, .advice-text td { white-space:normal!important; word-break:break-word; padding:8px; text-align:center; vertical-align:middle; }
.advice-text th { background-color:#e9f2ff; font-weight:600; }
`;
