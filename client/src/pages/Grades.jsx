import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import AppLayout from "../components/AppLayout";

// grade badge color (ported from grades-content.ejs)
function gradeBadge(grade) {
  if (grade === "P") return "bg-success";
  if (grade?.includes("A")) return "bg-success";
  if (grade?.includes("B")) return "bg-primary";
  if (grade?.includes("C")) return "bg-warning";
  if (grade?.includes("D")) return "bg-danger";
  if (grade === "F") return "bg-dark";
  return "bg-secondary";
}

// GPA calc (ported from the inline EJS logic)
function computeGpa(student) {
  if (student?.gpa && !isNaN(parseFloat(student.gpa))) return parseFloat(student.gpa);
  const all = student?.courses || [];
  const numeric = all.filter(
    (c) => c.score != null && c.score !== "P" && !isNaN(parseFloat(c.score))
  );
  const withCredit = numeric.filter((c) => parseInt(c.so_tin_chi) > 0);
  if (withCredit.length) {
    const weighted = withCredit.reduce((s, c) => s + parseFloat(c.score) * parseInt(c.so_tin_chi), 0);
    const credits = withCredit.reduce((s, c) => s + parseInt(c.so_tin_chi), 0);
    return weighted / credits;
  }
  if (numeric.length) {
    return numeric.reduce((s, c) => s + parseFloat(c.score), 0) / numeric.length;
  }
  return 0;
}

export default function Grades() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [modalCourse, setModalCourse] = useState(null); // {id,name,english,objective} | 'loading'

  useEffect(() => {
    api.get("/grades").then(setData).catch((e) => setError(e.message));
  }, []);

  async function openCourse(id) {
    setModalCourse("loading");
    try {
      const c = await api.get(`/course/${encodeURIComponent(id)}`);
      setModalCourse({ id, ...c });
    } catch {
      setModalCourse({ id, name: "—", english: "—", objective: "Không có dữ liệu." });
    }
  }

  if (error) {
    return (
      <AppLayout currentPage="grades" breadcrumb={[{ name: "Bảng điểm", icon: "fas fa-chart-line" }]}>
        <div className="alert alert-danger">{error}</div>
      </AppLayout>
    );
  }
  if (!data) {
    return (
      <AppLayout currentPage="grades" breadcrumb={[{ name: "Bảng điểm", icon: "fas fa-chart-line" }]}>
        <p className="text-muted">Đang tải bảng điểm...</p>
      </AppLayout>
    );
  }

  const { student, coursesByYear, completedCourses } = data;
  const totalCredits = (student.courses || []).length;
  const averageGPA = computeGpa(student);
  const years = Object.keys(coursesByYear).sort((a, b) => b - a);

  let tip;
  if (averageGPA >= 3.5) tip = { cls: "text-success", head: "🎉 Kết quả xuất sắc!", body: "Hãy duy trì phong độ này và tham gia thêm các hoạt động ngoại khóa." };
  else if (averageGPA >= 3.0) tip = { cls: "text-primary", head: "👍 Kết quả tốt!", body: "Cố gắng cải thiện một chút nữa để đạt mức xuất sắc." };
  else if (averageGPA >= 2.5) tip = { cls: "text-warning", head: "📚 Cần cải thiện", body: "Hãy tập trung hơn vào việc học và tham khảo tư vấn AI." };
  else tip = { cls: "text-danger", head: "⚠️ Cần nỗ lực nhiều hơn", body: "Hãy sử dụng tính năng tư vấn AI để có lộ trình học tập phù hợp." };

  return (
    <AppLayout currentPage="grades" breadcrumb={[{ name: "Bảng điểm", icon: "fas fa-chart-line" }]}>
      {/* header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2><i className="fas fa-chart-line me-2"></i>Bảng điểm học tập</h2>
              <p className="text-muted">Kết quả học tập của {student.name}</p>
            </div>
            <div>
              <button className="btn btn-outline-primary" onClick={() => window.print()}>
                <i className="fas fa-print me-2"></i>In bảng điểm
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* grades by year/semester */}
      {years.map((year) => (
        <div className="card mb-4 border-0 shadow-sm" key={year}>
          <div className="card-header bg-primary text-white">
            <h5 className="mb-0">
              <i className="fas fa-calendar-alt me-2"></i>Năm học {year}
            </h5>
          </div>
          <div className="card-body p-0">
            {Object.keys(coursesByYear[year]).sort().map((sem) => (
              <div className="border-bottom" key={sem}>
                <h6 className="bg-light p-3 mb-0">
                  <i className="fas fa-book me-2"></i>Học kỳ {sem}
                </h6>
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: "20%" }}>Mã môn học</th>
                        <th style={{ width: "50%" }}>Tên môn học</th>
                        <th style={{ width: "15%" }}>Điểm số</th>
                        <th style={{ width: "15%" }}>Xếp loại</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coursesByYear[year][sem].map((course) => (
                        <tr
                          key={course.id}
                          className="clickable-row"
                          style={{ cursor: "pointer" }}
                          onClick={() => openCourse(course.id)}
                        >
                          <td><strong>{course.id}</strong></td>
                          <td>{course.ten_mon || <span className="text-muted">-</span>}</td>
                          <td>
                            {course.score === "P" ? (
                              <span className="badge bg-success">Pass</span>
                            ) : course.score && !isNaN(parseFloat(course.score)) ? (
                              <span className="badge bg-primary">{course.score}</span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            {course.grade === "P" ? (
                              <span className="badge bg-success">Pass</span>
                            ) : course.grade ? (
                              <span className={`badge ${gradeBadge(course.grade)}`}>{course.grade}</span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* summary */}
      <div className="row">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-info text-white">
              <h6 className="mb-0"><i className="fas fa-chart-bar me-2"></i>Thống kê tổng quan</h6>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-4">
                  <div className="border-end">
                    <h4 className="text-primary">{totalCredits}</h4>
                    <small className="text-muted">Tổng môn học</small>
                  </div>
                </div>
                <div className="col-4">
                  <div className="border-end">
                    <h4 className="text-success">{completedCourses}</h4>
                    <small className="text-muted">Đã hoàn thành</small>
                  </div>
                </div>
                <div className="col-4">
                  <h4 className="text-warning">{averageGPA.toFixed(2)}</h4>
                  <small className="text-muted">GPA trung bình</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-success text-white">
              <h6 className="mb-0"><i className="fas fa-lightbulb me-2"></i>Gợi ý cải thiện</h6>
            </div>
            <div className="card-body">
              <p className={`${tip.cls} mb-1`}>{tip.head}</p>
              <small className="text-muted">{tip.body}</small>
              <div className="mt-3">
                <Link to="/advisor" className="btn btn-sm btn-outline-success">
                  <i className="fas fa-robot me-1"></i>Nhận tư vấn AI
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* course modal (React-controlled, no Bootstrap JS needed) */}
      {modalCourse && (
        <div
          className="modal-backdrop-custom"
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1050, padding: 20,
          }}
          onClick={() => setModalCourse(null)}
        >
          <div className="card shadow-lg" style={{ maxWidth: 640, width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <div className="card-header d-flex justify-content-between align-items-center">
              <h4 className="modal-title mb-0">Thông tin môn học</h4>
              <button type="button" className="btn-close" onClick={() => setModalCourse(null)}></button>
            </div>
            <div className="card-body">
              {modalCourse === "loading" ? (
                <p className="text-muted mb-0">Đang tải...</p>
              ) : (
                <>
                  <p><strong>Mã môn học:</strong> {modalCourse.id}</p>
                  <p><strong>Tên môn học:</strong> {modalCourse.name || "—"}</p>
                  <p><strong>Tên tiếng Anh:</strong> {modalCourse.english || "—"}</p>
                  <hr />
                  <p className="mb-0"><strong>Mục tiêu môn học:</strong> {modalCourse.objective || "—"}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
