import { useEffect, useState } from "react";
import mfCss from "./manageFlow.css?raw";
import mfBody from "./manageFlowBody.html?raw";

// escape a JSON string for use inside a double-quoted HTML attribute
function attrEscape(json) {
  return json.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

export default function ManageFlow() {
  const [html, setHtml] = useState(null);
  const [error, setError] = useState("");

  // 1) fetch the flowchart data, inject it into the editor markup
  useEffect(() => {
    fetch("/api/manageFlow", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load failed"))))
      .then((d) => {
        const drawData = attrEscape(JSON.stringify(d.drawData || {}));
        setHtml(mfBody.replace("__DRAWDATA__", drawData));
      })
      .catch((e) => setError(e.message));
  }, []);

  // 2) once the editor DOM is painted, run flowchartMange.js in an isolated scope
  useEffect(() => {
    if (!html) return;
    let cancelled = false;
    (async () => {
      try {
        const code = await fetch("/js/flowchartMange.js").then((r) => r.text());
        if (cancelled) return;
        // eslint-disable-next-line no-new-func
        new Function(code)();
      } catch {
        setError("Không tải được trình chỉnh sửa lộ trình.");
      }
    })();
    return () => { cancelled = true; };
  }, [html]);

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <div className="alert alert-danger">{error}</div>
        <a href="/dashboard">← Về Dashboard</a>
      </div>
    );
  }
  if (!html) {
    return <div style={{ padding: 24 }}>Đang tải trình chỉnh sửa...</div>;
  }

  return (
    <>
      {/* editor CSS — present only while this screen is mounted, so body{overflow:hidden}
          and the design tokens don't leak into the rest of the app */}
      <style>{mfCss}</style>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
