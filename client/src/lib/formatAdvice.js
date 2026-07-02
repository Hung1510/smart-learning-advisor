// Ported verbatim from public/js/advisor.js — turns the AI's markdown-ish
// output into the same HTML the EJS version rendered. Returns HTML strings
// (used with dangerouslySetInnerHTML), so behavior matches exactly.

const EMOJI = [
  [/🎉/g, '<i class="fas fa-trophy text-warning"></i>'],
  [/👍/g, '<i class="fas fa-thumbs-up text-success"></i>'],
  [/📚/g, '<i class="fas fa-book text-primary"></i>'],
  [/⚠️/g, '<i class="fas fa-exclamation-triangle text-warning"></i>'],
  [/📅/g, '<i class="fas fa-calendar-alt text-primary"></i>'],
  [/🔍/g, '<i class="fas fa-search text-info"></i>'],
  [/🔑/g, '<i class="fas fa-key text-warning"></i>'],
  [/⏳/g, '<i class="fas fa-hourglass-half text-warning"></i>'],
  [/💡/g, '<i class="fas fa-lightbulb text-warning"></i>'],
  [/💻/g, '<i class="fas fa-laptop-code text-primary"></i>'],
  [/🎯/g, '<i class="fas fa-bullseye text-danger"></i>'],
  [/📈/g, '<i class="fas fa-chart-line text-success"></i>'],
  [/🏢/g, '<i class="fas fa-building text-secondary"></i>'],
  [/⚡/g, '<i class="fas fa-bolt text-warning"></i>'],
  [/⭐/g, '<i class="fas fa-star text-warning"></i>'],
  [/📋/g, '<i class="fas fa-clipboard-list text-primary"></i>'],
  [/🤝/g, '<i class="fas fa-handshake text-success"></i>'],
  [/🧠/g, '<i class="fas fa-brain text-info"></i>'],
  [/💪/g, '<i class="fas fa-dumbbell text-success"></i>'],
  [/🚀/g, '<i class="fas fa-rocket text-primary"></i>'],
];

function processInline(text) {
  let out = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>");
  for (const [re, rep] of EMOJI) out = out.replace(re, rep);
  return out;
}

function buildTable(tableLines) {
  const rows = tableLines.filter((r) => {
    const t = r.trim();
    return t.startsWith("|") && !/^\|[\s\-:|]+\|$/.test(t);
  });
  if (rows.length === 0) return "";

  let html =
    '<div class="table-responsive mt-2 mb-3"><table class="table-bordered table-sm table-hover align-middle">';
  rows.forEach((row, idx) => {
    const cells = row.trim().split("|").slice(1, -1);
    if (idx === 0) {
      html += '<thead><tr class="table-primary">';
      cells.forEach((c) => (html += `<th class="text-center">${processInline(c.trim())}</th>`));
      html += "</tr></thead><tbody>";
    } else {
      html += "<tr>";
      cells.forEach((c) => (html += `<td>${processInline(c.trim())}</td>`));
      html += "</tr>";
    }
  });
  html += "</tbody></table></div>";
  return html;
}

export function formatAdvice(advice) {
  if (!advice) return "";
  const lines = advice.split("\n");
  const parts = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.length > 1) {
      const tableLines = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (t.startsWith("|") && t.endsWith("|") && t.length > 1) {
          tableLines.push(lines[i]);
          i++;
        } else break;
      }
      const tableHtml = buildTable(tableLines);
      if (tableHtml) parts.push(tableHtml);
      continue;
    }
    if (/^---+$/.test(trimmed)) { parts.push('<hr class="my-3">'); i++; continue; }
    if (/^#{1,3}\s/.test(trimmed)) {
      const text = trimmed.replace(/^#{1,3}\s+/, "");
      parts.push(`<h6 class="text-primary mt-4 mb-2 fw-bold">${processInline(text)}</h6>`);
      i++; continue;
    }
    if (/^\d+\.\s/.test(trimmed)) {
      parts.push(`<div class="ms-3 mb-1">${processInline(trimmed)}</div>`);
      i++; continue;
    }
    if (/^[-*]\s/.test(trimmed)) {
      const text = trimmed.replace(/^[-*]\s/, "");
      parts.push(`<div class="ms-3 mb-1"><i class="fas fa-circle text-primary me-2" style="font-size:0.5rem"></i>${processInline(text)}</div>`);
      i++; continue;
    }
    if (trimmed === "") { parts.push("<br>"); i++; continue; }
    parts.push(`<span>${processInline(lines[i])}</span><br>`);
    i++;
  }

  return `
    <div class="ai-advice-content">
      <div class="d-flex align-items-center mb-3">
        <i class="fas fa-robot text-primary me-2"></i>
        <h6 class="mb-0 text-primary">Lời khuyên từ AI Advisor</h6>
      </div>
      <div class="advice-text">${parts.join("")}</div>
      <div class="mt-4 p-3 bg-light rounded">
        <small class="text-muted">
          <i class="fas fa-info-circle me-1"></i>
          Lời khuyên này được tạo ra dựa trên phân tích kết quả học tập và thông tin bạn cung cấp.
          Hãy cân nhắc kỹ lưỡng và tham khảo thêm ý kiến từ giảng viên nếu cần.
        </small>
      </div>
    </div>`;
}
