import json
import sys
import io
import time
import base64
import requests
import argparse
import os
from datetime import datetime, timedelta
from playwright.sync_api import sync_playwright

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# ==================== CAU HINH ====================

parser = argparse.ArgumentParser()
parser.add_argument('username', nargs='?', default=None)
parser.add_argument('password', nargs='?', default=None)
parser.add_argument('--google', metavar='EMAIL', default=None)
parser.add_argument('--force', action='store_true',
                    help='Buoc fetch lai, bo qua cache')
args = parser.parse_args()

USERNAME       = args.username
PASSWORD       = args.password
GOOGLE_EMAIL   = args.google
FORCE_REFRESH  = args.force
BASE_URL       = "https://aao.eiu.edu.vn"
AAO_STATE_FILE = "aao_state.json"
CACHE_DIR      = "student_cache"          # Thu muc luu cache theo tung user
CACHE_TTL_HOURS = 24                       # Cache 1 ngay

# ==================================================


# ==================== CACHE HELPERS ====================

def _cache_path(user_id: str) -> str:
    os.makedirs(CACHE_DIR, exist_ok=True)
    safe_id = user_id.replace("@", "_at_").replace("/", "_")
    return os.path.join(CACHE_DIR, f"{safe_id}.json")


def load_cache(user_id: str):
    """Tra ve dict data neu cache con han, nguoc lai None."""
    path = _cache_path(user_id)
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            cached = json.load(f)
        cached_at = datetime.fromisoformat(cached["_cached_at"])
        if datetime.now() - cached_at < timedelta(hours=CACHE_TTL_HOURS):
            print(f"[cache] Hit cho '{user_id}' (luu luc {cached_at.strftime('%H:%M %d/%m/%Y')})")
            return cached["data"]
        print(f"[cache] Het han cho '{user_id}', se fetch lai...")
        return None
    except Exception as e:
        print(f"[cache] Loi doc cache: {e}")
        return None


def save_cache(user_id: str, data: dict):
    """Luu data kem timestamp vao file cache."""
    path = _cache_path(user_id)
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump({
                "_cached_at": datetime.now().isoformat(),
                "data": data
            }, f, ensure_ascii=False, indent=2)
        print(f"[cache] Da luu cache cho '{user_id}' -> {path}")
    except Exception as e:
        print(f"[cache] Loi ghi cache: {e}")


# ==================== LOGIN ====================

def get_token_and_cookies():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-extensions',
                '--blink-settings=imagesEnabled=false',
            ]
        )
        context = browser.new_context(java_script_enabled=True)
        page = context.new_page()

        # Chan resource khong can thiet
        def block_unnecessary(route):
            if route.request.resource_type in ["image", "font", "stylesheet", "media"]:
                route.abort()
            else:
                route.continue_()

        page.route("**/*", block_unnecessary)

        print("[login] Dang login username/password...")
        payload = {
            "username": USERNAME,
            "password": PASSWORD,
            "uri": f"{BASE_URL}/#/home"
        }
        code = base64.b64encode(
            json.dumps(payload, separators=(',', ':')).encode()
        ).decode()

        page.goto(
            f"{BASE_URL}/api/pn-signin?code={code}&gopage=&mgr=1",
            wait_until="domcontentloaded",
            timeout=15000
        )

        try:
            page.wait_for_function(
                "sessionStorage.getItem('CURRENT_USER')",
                timeout=10000,
                polling=200
            )
        except Exception:
            print("[login] Timeout cho CURRENT_USER!")
            browser.close()
            return None, None

        current_user = page.evaluate("sessionStorage.getItem('CURRENT_USER')")
        if not current_user:
            browser.close()
            return None, None

        user_data = json.loads(current_user)
        token = user_data.get("access_token")
        cookies = context.cookies()
        browser.close()

        print(f"[login] OK! Token: {token[:60]}...")
        return token, cookies


# ==================== GOOGLE SSO ====================

def login_google_and_save_session():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()

        page.goto(BASE_URL, timeout=60000)
        google_btn = page.locator(
            "button:has-text('Google'), a:has-text('Google'), [class*='google']"
        ).first

        if google_btn.count() == 0:
            print("Khong tim thay nut Google!")
            browser.close()
            return None

        google_btn.click()
        print("Hay dang nhap Google trong cua so vua mo...")

        try:
            page.wait_for_function("sessionStorage.getItem('CURRENT_USER')", timeout=120000)
        except Exception:
            print("Login timeout!")
            browser.close()
            return None

        context.storage_state(path=AAO_STATE_FILE)
        current_user = page.evaluate("sessionStorage.getItem('CURRENT_USER')")
        browser.close()
        return json.loads(current_user)


def load_google_session():
    if not os.path.exists(AAO_STATE_FILE):
        return None
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        )
        context = browser.new_context(storage_state=AAO_STATE_FILE)
        page = context.new_page()

        def block_unnecessary(route):
            if route.request.resource_type in ["image", "font", "stylesheet", "media"]:
                route.abort()
            else:
                route.continue_()

        page.route("**/*", block_unnecessary)
        page.goto(f"{BASE_URL}/#/home", wait_until="domcontentloaded", timeout=15000)

        try:
            page.wait_for_function(
                "sessionStorage.getItem('CURRENT_USER')",
                timeout=15000, polling=200
            )
        except Exception:
            print("Session het han!")
            browser.close()
            return None

        current_user = page.evaluate("sessionStorage.getItem('CURRENT_USER')")
        browser.close()
        return json.loads(current_user) if current_user else None


def get_token_google():
    user_data = load_google_session()
    if not user_data:
        user_data = login_google_and_save_session()
    return user_data


# ==================== API ====================

def build_session(cookies=None):
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": f"{BASE_URL}/",
        "Origin": BASE_URL,
    })
    for c in (cookies or []):
        session.cookies.set(c['name'], c['value'], domain=c['domain'])
    return session


def call_api(session, token, path, method="POST", body=None):
    url = f"{BASE_URL}/api/{path}" if not path.startswith("http") else path
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/plain, */*",
        "Authorization": f"Bearer {token}",
        "idpc": "0",
    }
    try:
        if method == "POST":
            r = session.post(url, json=body, headers=headers,
                             data="" if body is None else None)
        else:
            r = session.get(url, headers=headers)
        print(f"  [{r.status_code}] {path}")
        if r.status_code == 200:
            return r.json()
        return {"error": r.status_code, "msg": r.text[:300]}
    except Exception as e:
        return {"error": str(e)}


def print_section(title, data):
    print(f"\n{'='*55}\n  {title}\n{'='*55}")
    print(json.dumps(data, ensure_ascii=False, indent=2))


# ==================== FETCH FULL DATA ====================

def fetch_all_data(token, cookies) -> dict:
    """Goi API lay toan bo data sinh vien."""
    session = build_session(cookies)

    info = call_api(session, token, "dkmh/w-locsinhvieninfo", method="POST")
    diem = call_api(session, token,
                    "srm/w-locdsdiemsinhvien?hien_thi_mon_theo_hkdk=false",
                    method="POST", body={})
    return {
        "thong_tin_sinh_vien": info,
        "diem": diem,
    }


# ==================== MAIN ====================

def main():
    token   = None
    cookies = []
    user_id = None

    if GOOGLE_EMAIL:
        user_id = GOOGLE_EMAIL
        print(f"Mode: Google SSO ({GOOGLE_EMAIL})")

        # Kiem tra cache truoc
        if not FORCE_REFRESH:
            cached = load_cache(user_id)
            if cached:
                print_section("THONG TIN SINH VIEN (cache)", cached.get("thong_tin_sinh_vien", {}))
                print_section("DIEM SINH VIEN (cache)", cached.get("diem", {}))
                with open("student_data.json", "w", encoding="utf-8") as f:
                    json.dump(cached, f, ensure_ascii=False, indent=2)
                print("\n[cache] Da dung cache, khong can login lai.")
                return

        user_data = get_token_google()
        if not user_data:
            print("Login Google that bai!")
            sys.exit(1)
        token = user_data.get("access_token")

    elif USERNAME and PASSWORD:
        user_id = USERNAME
        print(f"Mode: Username/Password ({USERNAME})")

        # Kiem tra cache truoc
        if not FORCE_REFRESH:
            cached = load_cache(user_id)
            if cached:
                print_section("THONG TIN SINH VIEN (cache)", cached.get("thong_tin_sinh_vien", {}))
                print_section("DIEM SINH VIEN (cache)", cached.get("diem", {}))
                with open("student_data.json", "w", encoding="utf-8") as f:
                    json.dump(cached, f, ensure_ascii=False, indent=2)
                print("\n[cache] Da dung cache, khong can login lai.")
                return

        t0 = time.time()
        token, cookies = get_token_and_cookies()
        print(f"  Login mat: {time.time() - t0:.2f}s")

    else:
        print("Cach dung:")
        print("  python Eiu_student.py <username> <password>")
        print("  python Eiu_student.py <username> <password> --force   # Fetch lai, bo qua cache")
        print("  python Eiu_student.py --google <email@student.eiu.edu.vn>")
        sys.exit(1)

    if not token:
        print("Khong lay duoc token!")
        sys.exit(1)

    # Fetch data moi
    all_data = fetch_all_data(token, cookies)

    # Luu cache 1 ngay
    save_cache(user_id, all_data)

    # Luu ra file output
    with open("student_data.json", "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)
    print("\nDa luu data vao: student_data.json")

    print_section("THONG TIN SINH VIEN", all_data.get("thong_tin_sinh_vien", {}))
    print_section("DIEM SINH VIEN", all_data.get("diem", {}))


if __name__ == "__main__":
    main()