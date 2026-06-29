# Smart Learning Advisor

Hệ thống tư vấn học tập thông minh cho sinh viên EIU sử dụng Node.js và Express.js.

## Tính năng

- **Đăng nhập/Đăng xuất**: Xác thực sinh viên bằng ID và mật khẩu
- **Dashboard**: Hiển thị thông tin tổng quan về học tập
- **Xem điểm**: Xem bảng điểm chi tiết theo năm học và học kỳ
- **Tư vấn AI**: Nhận lời khuyên học tập cá nhân hóa dựa trên kết quả học tập

## Cài đặt

1. **Cài đặt Node.js** (nếu chưa có): https://nodejs.org/

2. **Cài đặt dependencies**:
   ```bash
   npm install
   ```

3. **Chạy ứng dụng**:

   **Sử dụng script Windows:**
   ```cmd
   start.bat
   ```

   **Hoặc sử dụng npm:**
   ```bash
   npm start
   ```

   **Hoặc chạy trực tiếp:**
   ```bash
   node app.js
   ```

4. **Truy cập ứng dụng**: Mở trình duyệt và truy cập `http://localhost:3000`

## Cách sử dụng

### Đăng nhập
- Sử dụng ID sinh viên và mật khẩu từ file `students.json`
- Ví dụ: ID: `1131fa2999d3`, Password: `9006`

### Dashboard
- Xem thông tin tổng quan: tổng số môn học, GPA trung bình
- Thông tin cá nhân sinh viên

### Xem điểm
- Bảng điểm chi tiết theo năm học và học kỳ
- Thống kê tổng quan về kết quả học tập
- Tính năng in bảng điểm

### Tư vấn AI
- Điền thông tin về mục tiêu và khó khăn
- Nhận lời khuyên cá nhân hóa từ AI
- Sử dụng câu hỏi mẫu để bắt đầu nhanh

## Cấu trúc dự án

```
Smart_Learning_Advisor/
├── app.js                      # File chính của ứng dụng với renderWithLayout
├── package.json                # Dependencies và scripts
├── students.json               # Dữ liệu sinh viên
├── start.bat                   # Script khởi động Windows
├── Students/                   # Lưu trữ phản hồi của sinh viên
├── public/                     # Files tĩnh (CSS, JS)
│   ├── css/
│   │   └── style.css          # Styles cho tất cả components
│   └── js/
│       ├── advisor.js         # Logic tư vấn AI
│       └── common.js          # Functions chung
└── views/                      # Templates EJS modular
    ├── layout.ejs             # Layout chính cho tất cả pages
    ├── login-content.ejs      # Nội dung trang đăng nhập
    ├── dashboard-content.ejs  # Nội dung dashboard
    ├── grades-content.ejs     # Nội dung bảng điểm
    ├── advisor-content.ejs    # Nội dung tư vấn AI
    └── partials/              # Components tái sử dụng
        ├── navigation.ejs     # Thanh điều hướng
        ├── breadcrumb.ejs     # Đường dẫn trang
        ├── footer.ejs         # Footer
        └── page-header.ejs    # Header động
```

## Tính năng kỹ thuật

- **Backend**: Node.js, Express.js với middleware xác thực
- **Frontend**: EJS Templates với layout system modular, Bootstrap 5, Font Awesome
- **Architecture**: Modular view system với layout.ejs và partials tái sử dụng
- **Session Management**: Express-session với timeout 1 giờ
- **Data Storage**: JSON files (không cần database)
- **AI Advisor**: Logic phân tích dữ liệu học tập tích hợp
- **Responsive Design**: Bootstrap 5 responsive components
- **Navigation**: Dynamic breadcrumbs và active page highlighting

## Kiến trúc ứng dụng

### Modular Layout System
Ứng dụng sử dụng hệ thống layout modular với:

- **layout.ejs**: Template chính chứa cấu trúc HTML cơ bản
- **Content templates**: Các file *-content.ejs chứa nội dung riêng của từng trang
- **Partials**: Components tái sử dụng (navigation, breadcrumb, footer, page-header)
- **renderWithLayout()**: Function helper render content trong layout

### Route Architecture
```javascript
// Ví dụ route sử dụng renderWithLayout
app.get('/dashboard', requireAuth, (req, res) => {
    renderWithLayout(res, 'dashboard-content', {
        student: req.session.student,
        title: 'Dashboard',
        currentPage: 'dashboard',
        breadcrumb: [{ name: 'Dashboard', icon: 'fas fa-tachometer-alt' }]
    });
});
```

### Benefits
- **DRY Principle**: Không lặp lại code layout
- **Maintainability**: Dễ bảo trì và cập nhật
- **Consistency**: Giao diện thống nhất
- **Performance**: Tối ưu rendering

## Lưu ý

- Ứng dụng chạy trên port 3000 (có thể thay đổi bằng biến môi trường PORT)
- Dữ liệu sinh viên được lưu trong file `students.json`
- Phản hồi tư vấn được lưu trong thư mục `Students/`
- Session timeout: 1 giờ

## Demo

### Tài khoản demo

Có thể sử dụng bất kỳ tài khoản nào trong file `students.json`. Ví dụ:

- ID: `1131fa2999d3`
- Password: `9006`

### Câu hỏi tư vấn mẫu

- "Làm thế nào để cải thiện GPA của tôi?"
- "Tôi nên tập trung vào môn nào?"
- "Chuẩn bị gì cho tương lai nghề nghiệp?"

## Hỗ trợ

Nếu gặp vấn đề, vui lòng kiểm tra:

1. Node.js đã được cài đặt
2. Tất cả dependencies đã được cài đặt (`npm install`)
3. Port 3000 không bị sử dụng bởi ứng dụng khác
4. File `students.json` tồn tại và có định dạng JSON hợp lệ

## Phiên bản hiện tại

**Version 2.0** - Architecture Refactored (June 2025)

### Changelog
- ✅ **Modular Layout System**: Triển khai hệ thống layout modular với `renderWithLayout()`
- ✅ **Reusable Partials**: Navigation, breadcrumb, footer, page-header components
- ✅ **Content-Only Templates**: Tách biệt nội dung và layout
- ✅ **Performance Optimization**: Giảm duplicate code và tối ưu rendering
- ✅ **Enhanced Navigation**: Active page highlighting và dynamic breadcrumbs
- ✅ **Bug Fixes**: Fixed breadcrumb null errors và session handling
- ✅ **Windows Support**: Thêm start.bat script cho Windows users

### Previous Versions
- **Version 1.0**: Initial release với basic functionality
