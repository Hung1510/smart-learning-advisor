# save_google_session.py
# Chạy 1 lần để lưu Google session:
#   python save_google_session.py
# File google_auth.json sẽ được tạo ra, dùng cho Eiu_student.py --google

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    context = browser.new_context()
    page = context.new_page()

    page.goto("https://accounts.google.com")
    print("=" * 50)
    print("Hãy login Google trong cửa sổ vừa mở.")
    print("Sau khi login xong, quay lại đây và nhấn Enter.")
    print("=" * 50)
    input()

    context.storage_state(path="google_auth.json")
    browser.close()
    print("Đã lưu session vào google_auth.json!")
    print("QUAN TRỌNG: Đừng commit file này lên Git!")