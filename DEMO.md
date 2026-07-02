<!-- Ngôn ngữ: **Tiếng Việt** · [English](DEMO.en.md) -->

# DEMO — Smart Learning Advisor

Hướng dẫn nhanh để chạy và demo ứng dụng.

## Chạy ứng dụng

Ở chế độ phát triển, frontend (React) và backend (Express API + landing) chạy riêng.

```bash
# terminal 1 — backend
node app.js                     # http://localhost:3010

# terminal 2 — frontend
cd client
npm install
npm run dev                     # http://localhost:5173
```

Mở **http://localhost:5173** để phát triển.

Để demo đúng trải nghiệm production (trang giới thiệu + app cùng nhau, giống bản
chạy thật): `cd client && npm run build`, rồi `node app.js`, và mở
**http://localhost:3010**.

> Bản chạy thật nằm trên Vercel — mở `/` ở đó sẽ thấy trang giới thiệu (SEO), bấm
> "Đăng nhập" để vào ứng dụng React.

## Tài khoản demo

Tài khoản chế độ test nằm trong `students.json`.

- **ID**: `1131fa2999d3`
- **Mật khẩu**: `9006`
- **Chuyên ngành**: SWE

Các ID khác trong `students.json` cũng dùng được (chế độ test). Bạn cũng có thể
đăng nhập bằng **Google (EIU)** nếu đã cấu hình OAuth.

## Nội dung để demo

1. **Đăng nhập** → chuyển đến Dashboard.
2. **Dashboard** — tổng số môn, tín chỉ đã hoàn thành, GPA trung bình, thông tin sinh viên, hành động nhanh.
3. **Xem điểm** — bảng điểm theo năm/học kỳ; nhấn vào một dòng môn để xem modal chi tiết; "In" để xem bản in.
4. **Tư vấn AI** — thử các mẫu:
   - Câu hỏi: *"Làm thế nào để cải thiện GPA của tôi?"* / *"Tôi nên tập trung vào môn nào?"*
   - Mục tiêu: *"Đạt GPA > 3.5 trong học kỳ tới"*
   - Khó khăn: *"Điểm các môn toán và lập trình thấp"*

   Lời khuyên hiển thị theo dạng streaming, sau đó render thành báo cáo có bảng.
5. **Lộ trình môn học** — kéo/cuộn sơ đồ D3, bật "Xem đề xuất môn", nhấp đúp vào một node để xem chi tiết, và dùng "Ask AI" để sang trang tư vấn đã điền sẵn.
6. **Nhắn tin** — chọn một cố vấn và gửi tin nhắn (thời gian thực qua Firebase).
7. **Sửa lộ trình** — trình chỉnh sửa node/cạnh toàn màn hình cho các sơ đồ.

## Xử lý sự cố

- **Login 404 / "unauthorized"** → đảm bảo `node app.js` đang chạy và `api-routes.js` nằm cạnh `app.js`.
- **Màn hình hiển thị nhưng mất style** → thiếu hoặc rỗng `client/public/style.css` (chép từ `public/css/style.css`).
- **Chat không kết nối** → kiểm tra CSP của Helmet đã cho phép Firebase (`gstatic.com`, `*.firebaseio.com`).
- **"Cannot find module"** → chạy `npm install` (một lần ở gốc cho backend, một lần trong `client/` cho frontend).
- **Port đang bị dùng** → đổi `PORT` trong `.env`, hoặc tắt tiến trình đang dùng `3010` / `5173`.

## Ghi chú kỹ thuật

- Responsive (Bootstrap 5), phiên đăng nhập bằng JWT cookie (hết hạn sau 1 giờ), phân tích AI dựa trên dữ liệu bảng điểm thực tế.
- Lưu trữ phản hồi/lời khuyên nằm trong bộ nhớ — không bền vững trên Vercel (xem README).
