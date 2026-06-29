# DEMO - Smart Learning Advisor

## Hướng dẫn chạy ứng dụng

### Cách 1: Sử dụng file batch (Khuyến nghị cho Windows)
1. Double-click vào file `start.bat`
2. Ứng dụng sẽ tự động khởi động

### Cách 2: Sử dụng Command Line
1. Mở Command Prompt hoặc PowerShell
2. Navigate đến thư mục dự án:
   ```cmd
   cd d:\EIU\Smart_Learning_Advisor\Web
   ```
3. Chạy ứng dụng:
   ```cmd
   node app.js
   ```

### Cách 3: Sử dụng npm
```cmd
npm start
```

## Truy cập ứng dụng

Sau khi khởi động thành công, mở trình duyệt và truy cập:
**http://localhost:3000**

## Tài khoản demo để đăng nhập

### Sinh viên 1
- **ID**: `1131fa2999d3`
- **Password**: `9006`
- **Tên**: `41db14`
- **Email**: `169e5f@eiu.edu.vn`
- **Chuyên ngành**: SWE
- **Khóa**: 2011

### Các ID sinh viên khác có thể sử dụng
(Tất cả đều có password: `9006`)

Bạn có thể tìm thêm ID sinh viên trong file `students.json`. Tất cả các tài khoản đều có password là `9006`.

## Tính năng để demo

### 1. Đăng nhập
- Sử dụng thông tin đăng nhập ở trên
- Hệ thống sẽ kiểm tra và chuyển hướng đến Dashboard

### 2. Dashboard
- Xem thông tin tổng quan về sinh viên
- Thống kê số môn học, GPA trung bình
- Thông tin cá nhân

### 3. Xem điểm
- Bảng điểm chi tiết theo năm học và học kỳ
- Thống kê kết quả học tập
- Tính năng in bảng điểm

### 4. Tư vấn AI
- **Câu hỏi mẫu để test**:
  - "Làm thế nào để cải thiện GPA của tôi?"
  - "Tôi nên tập trung vào môn nào để có hiệu quả cao nhất?"
  - "Tôi nên chuẩn bị gì để tìm được công việc tốt sau khi tốt nghiệp?"

- **Mục tiêu mẫu**:
  - "Đạt GPA > 3.5 trong học kỳ tới"
  - "Tìm được công việc trong lĩnh vực công nghệ"
  - "Tích lũy kinh nghiệm thực tế"

- **Khó khăn mẫu**:
  - "Điểm các môn toán và lập trình thấp"
  - "Khó khăn trong quản lý thời gian"
  - "Thiếu động lực học tập"

### 5. Lưu trữ phản hồi
- Mỗi khi sinh viên sử dụng tính năng tư vấn AI, thông tin sẽ được lưu vào thư mục `Students/`
- File sẽ có tên theo ID sinh viên (ví dụ: `1131fa2999d3.json`)

## Troubleshooting

### Lỗi "Cannot find module"
```cmd
npm install
```

### Lỗi "Port 3000 is already in use"
- Đóng ứng dụng khác đang sử dụng port 3000
- Hoặc thay đổi port trong file `app.js`

### Lỗi đăng nhập
- Đảm bảo sử dụng đúng ID và password
- Kiểm tra file `students.json` có tồn tại

## Tính năng kỹ thuật

- **Responsive Design**: Tương thích với mobile và desktop
- **Session Management**: Tự động đăng xuất sau 1 giờ
- **AI Logic**: Phân tích thông minh dựa trên dữ liệu học tập thực tế
- **Data Persistence**: Lưu trữ phản hồi trong file JSON
- **Modern UI**: Sử dụng Bootstrap 5 và Font Awesome icons

## Screenshots và Demo Flow

1. **Trang đăng nhập**: Giao diện hiện đại với validation
2. **Dashboard**: Thống kê tổng quan với cards thông tin
3. **Bảng điểm**: Hiển thị chi tiết theo năm học/học kỳ
4. **Tư vấn AI**: Interface chat-like với AI advisor
5. **Responsive**: Hoạt động tốt trên mobile và tablet
