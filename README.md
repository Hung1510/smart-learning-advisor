<!-- Ngôn ngữ: **Tiếng Việt** · [English](README.en.md) -->

# Smart Learning Advisor

Ứng dụng tư vấn học tập dùng AI cho sinh viên EIU: xem điểm, theo dõi GPA, xem lộ
trình môn học và nhận lời khuyên học tập cá nhân hóa.

Được xây dựng dưới dạng **ứng dụng React (Vite) một trang (SPA)** trên nền
**Express JSON API**, kèm một trang giới thiệu render phía server để tối ưu SEO.
Triển khai trên **Vercel**.

## Tính năng

- **Đăng nhập** — ID sinh viên + mật khẩu (qua dịch vụ EIU, hoặc `students.json` ở chế độ test), hoặc Google OAuth
- **Dashboard** — tổng quan môn học, số tín chỉ đã hoàn thành, GPA
- **Xem điểm** — bảng điểm theo năm/học kỳ, tính GPA, in được, có modal chi tiết từng môn
- **Tư vấn AI** — lời khuyên cá nhân hóa dạng streaming, dựng từ bảng điểm + lộ trình (model của GitHub, SSE)
- **Lộ trình môn học** — sơ đồ tiên quyết D3 tương tác, có gợi ý môn nên đăng ký
- **Nhắn tin** — trò chuyện thời gian thực với cố vấn (Firebase Realtime DB)
- **Sửa lộ trình** — trình chỉnh sửa D3 toàn màn hình để quản lý các sơ đồ

## Công nghệ

- **Frontend**: React 18 + Vite, React Router, Bootstrap 5, Font Awesome
- **Backend**: Node.js + Express (JSON API trong `api-routes.js`), xác thực bằng JWT cookie
- **Trang giới thiệu**: EJS render phía server (`views/landing.ejs`) — giữ ở server để Google index được
- **Dữ liệu / hạ tầng**: Upstash Redis (cache), Firebase Realtime DB (chat), model GitHub (AI), D3 (sơ đồ)
- **Bảo mật**: Helmet (CSP, HSTS), giới hạn tần suất theo IP cho login + advisor
- **Hosting**: Vercel (Express chạy dạng serverless function + bản build React)

## Cấu trúc dự án

```
smart_learning_advisor/
├── app.js                  # Express: landing, robots/sitemap, auth, rồi require api-routes
├── api-routes.js           # TẤT CẢ route /api/* + phục vụ SPA (backend cho React)
├── vercel.json             # build + security headers
├── package.json            # deps backend + "vercel-build" (build client)
├── students.json  courses.json  flowchart.json  courseDescription.json   # dữ liệu
├── client/                 # ứng dụng React
│   ├── index.html  vite.config.js  package.json
│   ├── public/             # style.css + js đã sửa (flowchart/chat/flowchartMange)
│   └── src/
│       ├── main.jsx  App.jsx
│       ├── lib/            # api.js, formatAdvice.js
│       ├── context/        # AuthContext.jsx
│       ├── components/     # AppLayout.jsx, ProtectedRoute.jsx
│       └── pages/          # Login, Dashboard, Grades, Advisor, Flowchart, Chat, ManageFlow
├── views/landing.ejs       # trang giới thiệu công khai (render phía server, cho SEO)
└── public/                 # static của Express: og-image, css, js, file xác minh Search Console
```

## Chạy trên máy

Cần Node 22+. Có hai chế độ.

### Phát triển (nhanh, tự động tải lại)

```bash
# terminal 1 — backend API + landing
node app.js                     # http://localhost:3010

# terminal 2 — React dev server
cd client
npm install
npm run dev                     # http://localhost:5173  (proxy /api và /auth sang :3010)
```
Mở **http://localhost:5173**. Chế độ này phục vụ trực tiếp ứng dụng React (không có
trang giới thiệu — trang đó chỉ nằm ở phía Express).

### Xem thử giống production (giống hệt Vercel)

```bash
cd client && npm run build      # xuất ra ../client-dist
cd ..
node app.js
```
Mở **http://localhost:3010** — Express phục vụ trang giới thiệu tại `/` và bản
build React cho các đường dẫn còn lại, giống hệt production.

## Biến môi trường

Tạo file `.env` ở thư mục gốc (và đặt cùng các key này trong Vercel → Settings →
Environment Variables):

```
SITE_URL=https://ten-mien-cua-ban.vercel.app
JWT_SECRET=<chuỗi ngẫu nhiên>
SESSION_SECRET=<chuỗi ngẫu nhiên>
GITHUB_TOKEN=<token cho model AI>
GOOGLE_CLIENT_ID=<oauth client id>
GOOGLE_CLIENT_SECRET=<oauth client secret>
GOOGLE_CALLBACK_URL=https://ten-mien-cua-ban.vercel.app/auth/google/callback
UPSTASH_REDIS_REST_URL=<...>
UPSTASH_REDIS_REST_TOKEN=<...>
PYTHON_API_URL=<dịch vụ dữ liệu EIU>
```
Tạo secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
Tuyệt đối không commit `.env` — để nó trong `.gitignore`.

## Triển khai

Push lên nhánh `main`. Vercel chạy script `vercel-build`
(`cd client && npm install && npm run build`), rồi phục vụ `app.js` dạng function
cùng bản build React. Trang giới thiệu vẫn được Google index; các màn hình trong
app đặt `noindex`.

## Tài khoản demo

Tài khoản chế độ test nằm trong `students.json` — ví dụ ID `1131fa2999d3`, mật khẩu `9006`.

## Lưu ý

- Lời khuyên AI và môn đã chọn được lưu trong bộ nhớ, **không bền vững trên Vercel**
  (mất khi cold start). Chuyển sang Redis nếu cần lưu lâu dài.
- Nút "Save" của trình sửa lộ trình ghi vào `flowchart.json` trên đĩa — cũng không
  bền vững trên Vercel.
