import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";

const CHAT_CSS = `
#chatBox { height: 400px; overflow-y: auto; }
.user-list { max-height: 400px; overflow-y: auto; }
.chat-header { background-color: #f8f9fa; }
.hidden { display: none; }
`;

export default function Chat() {
  const [data, setData] = useState(null); // { student, users }
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/chat", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load failed"))))
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  // load the Firebase chat client after the DOM (contacts + data-student) is painted.
  // module scope + a cache-busting query means re-visiting the page re-runs it
  // cleanly without "identifier already declared".
  useEffect(() => {
    if (!data) return;
    const s = document.createElement("script");
    s.type = "module";
    s.src = `/js/chat.js?v=${Date.now()}`;
    document.body.appendChild(s);
    return () => { s.remove(); };
  }, [data]);

  return (
    <AppLayout currentPage="chat" breadcrumb={[{ name: "Nhắn tin", icon: "fas fa-comment" }]}>
      <style>{CHAT_CSS}</style>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row chat-card">
        {/* contacts */}
        <div className="col-md-4">
          <div className="card">
            <div className="card-header chat-header">
              <h5><i className="fas fa-users me-2"></i>Sinh viên</h5>
            </div>
            <div className="card-body user-list">
              <div className="d-flex justify-content-between align-items-center mb-2 px-2">
                <span className="fw-semibold">Danh sách trò chuyện</span>
                <button className="btn btn-sm btn-outline-primary" id="addUserBtn">
                  <i className="fas fa-user-plus me-1"></i>Thêm người
                </button>
              </div>
              <ul className="list-group" id="userList">
                {(data?.users || []).map((u) => (
                  <li
                    key={u.id}
                    className="list-group-item list-group-item-action"
                    data-user-id={u.id}
                    data-user-name={u.name}
                  >
                    <i className="fas fa-user me-2"></i>
                    {u.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* chat pane */}
        <div className="col-md-8">
          <div className="card" id="chatContainer" data-student={JSON.stringify(data?.student || {})}>
            <div className="card-header chat-header">
              <h5 id="chatWith">Chọn người để trò chuyện</h5>
            </div>
            <div className="card-body" id="chatBox">
              <p id="debugStatus">Đang khởi động...</p>
            </div>
            <div className="card-footer">
              <div className="input-group">
                <input type="text" className="form-control" id="messageInput" placeholder="Nhập tin nhắn..." />
                <button className="btn btn-primary" id="sendBtn">
                  <i className="fas fa-paper-plane"></i> Gửi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
