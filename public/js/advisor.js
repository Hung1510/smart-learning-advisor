const Container = document.getElementById('contain');
const drawData = JSON.parse(Container.getAttribute('data-drawdata'));
const student = JSON.parse(Container.getAttribute('data-student'));
const suggest = JSON.parse(Container.getAttribute('data-value'));
const fromFlowchart = JSON.parse(Container.getAttribute('data-flowchart'));
const dataFlow = JSON.parse(Container.getAttribute('dataFlow'));

if (dataFlow.length > 0) {
    document.getElementById('question').value = dataFlow[0];
    document.getElementById('goals').value = dataFlow[1];
    document.getElementById('difficulties').value = dataFlow[2];
}

let choosenCoures = "";
if (fromFlowchart.length > 0) {
    choosenCoures = `Những môn học sinh viên chọn đăng ký vào kỳ sau: ${fromFlowchart.join(", ")}.`;
}

const suggestedCourses = `Những môn học được đề xuất cho sinh viên đăng ký vào kỳ sau: ${suggest.join(", ")}.`;

const cohortNumber = parseInt(student.cohort.slice(-2));
const formattedCourses = student.courses.map(course => {
    return `• ${course.id} - Điểm: ${course.score}, Hạng: ${course.grade}, Học kỳ: ${course.semester}/${course.year || "?"}`;
}).join("\n");

let program = student.major;
if (cohortNumber >= 23) program += '23';
else if (cohortNumber >= 21) program += '21';
else program += '18';

const data = drawData[program];
let LearningPath = "1. Tất cả các môn học theo ngành (GENED: môn sơ nghành, SPEC: môn chuyên ngành, ELEC: môn tự chọn, CAPSTONE: môn chuyên môn theo từng hướng của ngành): \n";
LearningPath += data.nodes
    .filter(course => course.id !== "")
    .map(course => `- ${course.id}, độ ưu tiên: ${course.year}, thuộc nhóm: ${course.group}`)
    .join('\n');

LearningPath += "\n2. Tiên quyết giữa các môn học: \n";
LearningPath += data.links.map(link =>
    `- Muốn học **${link.target}**, sinh viên cần hoàn thành **${link.source}**.`
).join('\n');

LearningPath += "\n3. Nhóm các môn tự chọn: \n";
const grouped = {};
data.ELEC.forEach(e => {
    if (!grouped[e.id]) grouped[e.id] = [];
    grouped[e.id].push(e.name);
});
LearningPath += Object.entries(grouped).map(([group, courses]) =>
    `- Nhóm ${group} gồm các môn:\n  ${courses.join(',  ')}`
).join('\n');


document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('advisorForm');
    const submitBtn = document.getElementById('submitBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const aiResponse = document.getElementById('aiResponse');
    const sampleQuestions = document.querySelectorAll('.sample-question');

    // ===== FORM SUBMIT =====
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const formData = new FormData(form);
        const requestData = {
            subject: formattedCourses,
            path: LearningPath,
            question: formData.get('question'),
            goals: formData.get('goals'),
            difficulties: formData.get('difficulties'),
            suggested: suggestedCourses,
            choosen: choosenCoures
        };

        showLoading();

        try {
            const response = await fetch('/advisor', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestData)
            });

            hideLoading();
            aiResponse.style.display = 'block';
            aiResponse.innerHTML = `
                <div class="ai-advice-content">
                    <div class="d-flex align-items-center mb-3">
                        <i class="fas fa-robot text-primary me-2"></i>
                        <h6 class="mb-0 text-primary">
                            AI đang trả lời
                            <span id="typingDots">
                                <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
                            </span>
                        </h6>
                    </div>
                    <div class="advice-text" id="streamText"></div>
                </div>
            `;
            aiResponse.scrollIntoView({ behavior: 'smooth', block: 'start' });

            const streamEl = document.getElementById('streamText');
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let lineBuffer = '';
            let textBuffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                lineBuffer += decoder.decode(value, { stream: true });
                const lines = lineBuffer.split('\n');
                lineBuffer = lines.pop();

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith('data: ')) continue;

                    const payload = trimmed.slice(6).trim();
                    if (!payload || payload === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(payload);

                        if (typeof parsed.token === 'string' && parsed.token.length > 0) {
                            textBuffer += parsed.token;
                            streamEl.textContent = textBuffer;
                        }

                        if (parsed.done) {
                            aiResponse.innerHTML = formatAdvice(parsed.fullText);
                        }

                        if (parsed.error) {
                            showError(parsed.fallback || 'Có lỗi xảy ra.');
                        }

                    } catch (err) {
                        console.warn('Parse lỗi (bỏ qua):', payload, err.message);
                    }
                }
            }

        } catch (error) {
            console.error('Fetch error:', error);
            hideLoading();
            showError('Có lỗi xảy ra khi xử lý yêu cầu. Vui lòng thử lại.');
        }
    });

    // ===== SAMPLE QUESTIONS =====
    sampleQuestions.forEach(button => {
        button.addEventListener('click', function () {
            document.getElementById('question').value = this.getAttribute('data-question');
            document.getElementById('goals').value = this.getAttribute('data-goals');
            document.getElementById('difficulties').value = this.getAttribute('data-difficulties');

            this.classList.add('btn-primary');
            this.classList.remove('btn-outline-secondary');
            setTimeout(() => {
                this.classList.remove('btn-primary');
                this.classList.add('btn-outline-secondary');
            }, 300);
        });
    });

    // ===== HELPERS =====
    function showLoading() {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang xử lý...';
        loadingIndicator.style.display = 'block';
        aiResponse.style.display = 'none';
    }

    function hideLoading() {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Nhận tư vấn từ AI';
        loadingIndicator.style.display = 'none';
    }

    function showError(message) {
        aiResponse.style.display = 'block';
        aiResponse.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${message}
            </div>
        `;
    }

    // ===== INLINE PROCESSOR =====
    function processInline(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/🎉/g, '<i class="fas fa-trophy text-warning"></i>')
            .replace(/👍/g, '<i class="fas fa-thumbs-up text-success"></i>')
            .replace(/📚/g, '<i class="fas fa-book text-primary"></i>')
            .replace(/⚠️/g, '<i class="fas fa-exclamation-triangle text-warning"></i>')
            .replace(/📅/g, '<i class="fas fa-calendar-alt text-primary"></i>')
            .replace(/🔍/g, '<i class="fas fa-search text-info"></i>')
            .replace(/🔑/g, '<i class="fas fa-key text-warning"></i>')
            .replace(/⏳/g, '<i class="fas fa-hourglass-half text-warning"></i>')
            .replace(/💡/g, '<i class="fas fa-lightbulb text-warning"></i>')
            .replace(/💻/g, '<i class="fas fa-laptop-code text-primary"></i>')
            .replace(/🎯/g, '<i class="fas fa-bullseye text-danger"></i>')
            .replace(/📈/g, '<i class="fas fa-chart-line text-success"></i>')
            .replace(/🏢/g, '<i class="fas fa-building text-secondary"></i>')
            .replace(/⚡/g, '<i class="fas fa-bolt text-warning"></i>')
            .replace(/⭐/g, '<i class="fas fa-star text-warning"></i>')
            .replace(/📋/g, '<i class="fas fa-clipboard-list text-primary"></i>')
            .replace(/🤝/g, '<i class="fas fa-handshake text-success"></i>')
            .replace(/🧠/g, '<i class="fas fa-brain text-info"></i>')
            .replace(/💪/g, '<i class="fas fa-dumbbell text-success"></i>')
            .replace(/🚀/g, '<i class="fas fa-rocket text-primary"></i>');
    }

    // ===== TABLE BUILDER =====
    function buildTable(tableLines) {
        // Lọc bỏ dòng separator (---) nhưng giữ lại header và data rows
        const rows = tableLines.filter(r => {
            const t = r.trim();
            // Bỏ dòng chỉ chứa |, -, :, space (separator row)
            return t.startsWith('|') && !/^\|[\s\-:|]+\|$/.test(t);
        });

        if (rows.length === 0) return '';

        let html = '<div class="table-responsive mt-2 mb-3"><table class="table-bordered table-sm table-hover align-middle">';

        rows.forEach((row, idx) => {
            // Tách cells: bỏ phần tử đầu và cuối (empty do split '|')
            const cells = row.trim().split('|').slice(1, -1);

            if (idx === 0) {
                // Header row
                html += '<thead><tr class="table-primary">';
                cells.forEach(c => {
                    html += `<th class="text-center">${processInline(c.trim())}</th>`;
                });
                html += '</tr></thead><tbody>';
            } else {
                html += '<tr>';
                cells.forEach(c => {
                    html += `<td>${processInline(c.trim())}</td>`;
                });
                html += '</tr>';
            }
        });

        html += '</tbody></table></div>';
        return html;
    }

    // ===== FORMAT ADVICE (line-by-line parser) =====
    function formatAdvice(advice) {
        if (!advice) return '';

        const lines = advice.split('\n');
        const outputParts = [];
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];
            const trimmed = line.trim();

            // Markdown table: gom tất cả dòng liên tiếp bắt đầu bằng |
            if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 1) {
                const tableLines = [];
                while (i < lines.length) {
                    const t = lines[i].trim();
                    if (t.startsWith('|') && t.endsWith('|') && t.length > 1) {
                        tableLines.push(lines[i]);
                        i++;
                    } else {
                        break;
                    }
                }
                const tableHtml = buildTable(tableLines);
                if (tableHtml) outputParts.push(tableHtml);
                continue;
            }

            // --- → <hr>
            if (/^---+$/.test(trimmed)) {
                outputParts.push('<hr class="my-3">');
                i++; continue;
            }

            // ## heading
            if (/^#{1,3}\s/.test(trimmed)) {
                const text = trimmed.replace(/^#{1,3}\s+/, '');
                outputParts.push(`<h6 class="text-primary mt-4 mb-2 fw-bold">${processInline(text)}</h6>`);
                i++; continue;
            }

            // Numbered list
            if (/^\d+\.\s/.test(trimmed)) {
                outputParts.push(`<div class="ms-3 mb-1">${processInline(trimmed)}</div>`);
                i++; continue;
            }

            // Bullet - hoặc *
            if (/^[-*]\s/.test(trimmed)) {
                const text = trimmed.replace(/^[-*]\s/, '');
                outputParts.push(`<div class="ms-3 mb-1"><i class="fas fa-circle text-primary me-2" style="font-size:0.5rem"></i>${processInline(text)}</div>`);
                i++; continue;
            }

            // Dòng trống
            if (trimmed === '') {
                outputParts.push('<br>');
                i++; continue;
            }

            // Dòng thường
            outputParts.push(`<span>${processInline(line)}</span><br>`);
            i++;
        }

        return `
            <div class="ai-advice-content">
                <div class="d-flex align-items-center mb-3">
                    <i class="fas fa-robot text-primary me-2"></i>
                    <h6 class="mb-0 text-primary">Lời khuyên từ AI Advisor</h6>
                </div>
                <div class="advice-text">
                    ${outputParts.join('')}
                </div>
                <div class="mt-4 p-3 bg-light rounded">
                    <small class="text-muted">
                        <i class="fas fa-info-circle me-1"></i>
                        Lời khuyên này được tạo ra dựa trên phân tích kết quả học tập và thông tin bạn cung cấp.
                        Hãy cân nhắc kỹ lưỡng và tham khảo thêm ý kiến từ giảng viên nếu cần.
                    </small>
                </div>
            </div>
        `;
    }

    // Animation robot icon
    const aiIcon = document.querySelector('.ai-icon-container .fa-robot');
    if (aiIcon) {
        setInterval(() => {
            aiIcon.style.color = `hsl(${Math.random() * 360}, 70%, 50%)`;
        }, 3000);
    }
});


// ===== CSS =====
const style = document.createElement('style');
style.textContent = `
    @keyframes blink {
        0%, 80%, 100% { opacity: 0; }
        40% { opacity: 1; }
    }
    .dot {
        animation: blink 1.4s infinite both;
    }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }

     .advice-text {
    line-height: 1.8;
    color: #333;
    white-space: pre-wrap;
}
    .advice-text h6 {
        margin-top: 1.5rem;
        margin-bottom: 0.5rem;
        padding-bottom: 0.25rem;
        border-bottom: 2px solid #e9ecef;
        white-space: normal;
    }
    .advice-text .ms-3 {
        padding-left: 1rem;
        margin-bottom: 0.5rem;
        white-space: normal;
    }
    .advice-text span {
        white-space: normal;
    }
    .advice-text table {
        white-space: normal;
    }
      

/* ===== TABLE FIX ===== */
.table-responsive {
    width: 100%;
    overflow-x: auto;
    overflow-y: visible;
}

.advice-text table {
    width: 100%;
    border-collapse: collapse;
    table-layout: auto;
    white-space: normal !important;
    margin-bottom: 1rem;
}

.advice-text th,
.advice-text td {
    white-space: normal !important;
    word-break: break-word;
    padding: 8px;
    text-align: center;
    vertical-align: middle;
}

.advice-text th {
    background-color: #e9f2ff;
    font-weight: 600;
}
`;
document.head.appendChild(style);