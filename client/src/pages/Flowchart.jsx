import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";

// load an external script once (returns a promise)
function loadScriptOnce(src, id) {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.id = id;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function Flowchart() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  // 1) fetch the data flowchart.js expects (same shape as GET /flowchart)
  useEffect(() => {
    fetch("/api/flowchart", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load failed"))))
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  // 2) once the DOM + data-attributes are painted, boot the D3 script
  useEffect(() => {
    if (!data) return;
    let cancelled = false;

    (async () => {
      try {
        await loadScriptOnce("https://d3js.org/d3.v7.min.js", "d3-v7");
        if (cancelled) return;

        // clear any previous render (guards SPA re-mounts)
        const svgEl = document.getElementById("mySvg");
        if (svgEl) svgEl.innerHTML = "";

        // your flowchart.js, unchanged except its two fetch() targets.
        // Run it in an isolated function scope so its top-level `const`s don't
        // collide when this screen is re-mounted via client-side navigation,
        // then expose the two inline-onclick handlers to window for the buttons.
        const code = await fetch("/js/flowchart.js").then((r) => r.text());
        if (cancelled) return;
        // eslint-disable-next-line no-new-func
        new Function(
          code +
            "\n;try{window.handlePrintOption=handlePrintOption;}catch(e){}" +
            "try{window.printChart=printChart;}catch(e){}"
        )();
      } catch (e) {
        setError("Không tải được sơ đồ lộ trình.");
      }
    })();

    return () => {
      cancelled = true;
      const svgEl = document.getElementById("mySvg");
      if (svgEl) svgEl.innerHTML = "";
    };
  }, [data]);

  return (
    <AppLayout
      currentPage="flowchart"
      breadcrumb={[{ name: "Lộ trình", icon: "fas fa-diagram-project" }]}
    >
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Header + action buttons (ported from flowChart.ejs) */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex flex-wrap justify-content-between align-items-center">
            <div className="flowchart mb-3">
              <h2><i className="fas fa-diagram-project me-2"></i>Lộ trình học</h2>
              <hr />
              <p className="text-muted">Lộ trình học tập của {data?.student?.name}</p>
            </div>

            <div className="d-flex flex-column flex-sm-row gap-2 mb-3">
              <button
                className="btn btn-outline-primary"
                data-value={JSON.stringify(data?.suggestedCourses || [])}
                data-active="false"
                id="showCoures"
                onClick={(e) => window.handlePrintOption && window.handlePrintOption(e)}
              >
                Xem Đề Xuất Môn
              </button>
              <button className="btn btn-outline-primary d-md-block d-none" id="save1" data-bs-toggle="tooltip" title="Save">
                <i className="fas fa-save me-1"></i>
              </button>
              <button className="btn btn-sm btn-outline-success d-md-block d-none" id="goToAdvisor1" data-bs-toggle="tooltip" title="Ask AI">
                <i className="fas fa-robot fa-1x"></i>
              </button>
              <button className="btn btn-outline-primary d-md-block d-none" data-bs-toggle="tooltip" title="Print" onClick={() => window.printChart && window.printChart()}>
                <i className="fa fa-print"></i>
              </button>
              <button className="btn btn-info btn-sm d-md-block d-none" id="showFunctions1" data-bs-toggle="tooltip" title="Info">
                <i className="fas fa-info-circle"></i>
              </button>

              {/* small-screen dropdown */}
              <div className="dropdown d-md-none">
                <button className="btn btn-outline-success" type="button" id="dropdownMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
                  Tính năng khác
                </button>
                <ul className="dropdown-menu" aria-labelledby="dropdownMenuButton">
                  <li><button className="dropdown-item btn btn-outline-primary" id="save2" data-bs-toggle="tooltip"><i className="fas fa-save me-1"></i> Save</button></li>
                  <li><button className="dropdown-item btn btn-sm btn-outline-success" id="goToAdvisor2" data-bs-toggle="tooltip"><i className="fas fa-robot fa-1x"></i> Ask AI</button></li>
                  <li><button className="dropdown-item btn btn-info btn-sm" id="showFunctions2" data-bs-toggle="tooltip"><i className="fas fa-info-circle"></i></button></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SVG canvas */}
      <div className="card border-0 shadow-sm chart">
        <svg id="mySvg"></svg>
        <div id="tooltip" style={{ display: "none" }} className="newtooltip"></div>
      </div>

      {/* Table popup */}
      <div id="popupOverlay" style={{ display: "none" }}>
        <div id="popup">
          <div id="popupContent">
            <table id="popupTable">
              <thead><tr><th>ID</th><th>Name</th><th>Review</th><th>Grade</th></tr></thead>
              <tbody id="tableBody"></tbody>
            </table>
            <p id="noDataMessage" style={{ display: "none", color: "red" }}>No data available</p>
          </div>
          <button id="closePopup">Close</button>
        </div>
      </div>

      {/* Function info modal */}
      <div className="modal fade" id="functionModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title"><i className="fas fa-info-circle me-2 text-info"></i>Hướng dẫn chức năng</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <ul className="list-group">
                <li className="list-group-item"><i className="fas fa-lightbulb text-warning me-2"></i><strong>Xem đề xuất môn:</strong> Mở/tắt các môn được hệ thống đề xuất cho học kỳ tiếp theo dựa trên tiến độ học.</li>
                <li className="list-group-item"><i className="fas fa-save text-primary me-2"></i><strong>Lưu (Save):</strong> Sau khi chọn môn phù hợp, nhấn Save để lưu lại. Nếu muốn quay lại đề xuất của hệ thống, hãy bỏ chọn hoặc tải lại trang và lưu lại.</li>
                <li className="list-group-item"><i className="fas fa-robot text-secondary me-2"></i><strong>AI:</strong> Chuyển đến trang tư vấn AI để hỏi đáp và nhận khuyến nghị.</li>
                <li className="list-group-item"><i className="fa fa-print text-success me-2"></i><strong>In (Print):</strong> In lộ trình học hiện tại.</li>
                <li className="list-group-item"><strong>✔ / ✖:</strong> Chọn hoặc bỏ chọn các môn được đề xuất.</li>
                <li className="list-group-item"><strong>Môn tự chọn:</strong> Nhấn vào môn ELEC để chọn môn cụ thể tương ứng.</li>
                <li className="list-group-item"><strong>Kéo/Thả/Cuộn:</strong> Di chuyển sơ đồ bằng chuột.</li>
                <li className="list-group-item"><strong>Double click:</strong> Xem thông tin môn học.</li>
              </ul>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
            </div>
          </div>
        </div>
      </div>

      {/* Course info modal */}
      <div className="modal fade" id="courseModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Thông tin môn học</h4>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body">
              <p><strong>Mã môn học:</strong> <span id="course-id"></span></p>
              <p><strong>Tên môn học:</strong> <span id="course-name"></span></p>
              <p><strong>Tên tiếng Anh:</strong> <span id="course-english"></span></p>
              <hr />
              <p><strong>Mục tiêu môn học:</strong> <span id="course-objective"></span></p>
            </div>
          </div>
        </div>
      </div>

      {/* data container flowchart.js reads from */}
      <div
        id="flowchart-container"
        data-drawdata={JSON.stringify(data?.drawData || {})}
        data-student={JSON.stringify(data?.student || {})}
        data-coursesdata={JSON.stringify(data?.coursesData || [])}
      ></div>
    </AppLayout>
  );
}
