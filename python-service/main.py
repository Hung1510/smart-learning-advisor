import json
import sys
import io
import time
import base64
import requests
import asyncio
import traceback
from urllib.parse import unquote
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from playwright.sync_api import sync_playwright

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

_executor = ThreadPoolExecutor(max_workers=4)

# ==================== CONFIG ====================
BASE_URL = "https://aao.eiu.edu.vn"
# ================================================

app = FastAPI(title="EIU Student API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== SCHEMAS ====================
class LoginRequest(BaseModel):
    username: str
    password: str

class GoogleAccessTokenRequest(BaseModel):
    access_token: str


# ==================== HELPERS ====================

def _build_session(cookies=None):
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": f"{BASE_URL}/",
        "Origin": BASE_URL,
    })
    for c in (cookies or []):
        session.cookies.set(c['name'], c['value'], domain=c['domain'])
    return session


def _call_api(session, token: str, path: str, method="POST", body=None):
    url = f"{BASE_URL}/api/{path}" if not path.startswith("http") else path
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/plain, */*",
        "Authorization": f"Bearer {token}",
        "idpc": "0",
    }
    if method == "POST":
        r = session.post(url, json=body, headers=headers,
                         data="" if body is None else None)
    else:
        r = session.get(url, headers=headers)

    if r.status_code == 200:
        return r.json()
    raise HTTPException(status_code=r.status_code,
                        detail=f"AAO API error: {r.text[:300]}")


def _fetch_student_data(token: str, cookies=None) -> dict:
    session = _build_session(cookies)
    info = _call_api(session, token, "dkmh/w-locsinhvieninfo", method="POST")
    diem = _call_api(session, token,
                     "srm/w-locdsdiemsinhvien?hien_thi_mon_theo_hkdk=false",
                     method="POST", body={})
    return {
        "thong_tin_sinh_vien": info,
        "diem": diem,
    }


# ==================== LOGIN USERNAME/PASSWORD ====================

def _get_token_password(username: str, password: str):
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        )
        context = browser.new_context()
        page = context.new_page()

        def block_unnecessary(route):
            if route.request.resource_type in ["image", "font", "stylesheet", "media"]:
                route.abort()
            else:
                route.continue_()
        page.route("**/*", block_unnecessary)

        payload = {
            "username": username,
            "password": password,
            "uri": f"{BASE_URL}/#/home"
        }
        code = base64.b64encode(
            json.dumps(payload, separators=(',', ':')).encode()
        ).decode()

        page.goto(
            f"{BASE_URL}/api/pn-signin?code={code}&gopage=&mgr=1",
            wait_until="networkidle",
            timeout=60000
        )
        time.sleep(3)

        current_user = page.evaluate("sessionStorage.getItem('CURRENT_USER')")
        if not current_user:
            browser.close()
            raise ValueError("Sai tên đăng nhập hoặc mật khẩu!")

        user_data = json.loads(current_user)
        token = user_data.get("access_token")
        cookies = context.cookies()
        browser.close()
        print(f"[password-login] OK! Token: {token[:40]}...")
        return token, cookies


# ==================== LOGIN GOOGLE ACCESS TOKEN ====================

def _login_aao_with_access_token(access_token: str):
    from urllib.parse import urlparse, parse_qs

    payload = json.dumps({
        "username": "user@gw",
        "password": access_token,
        "uri": f"{BASE_URL}/#/home"
    }, separators=(',', ':'))

    code = base64.b64encode(payload.encode()).decode()
    url  = f"{BASE_URL}/api/pn-signin?code={code}&gopage=&mgr=1"

    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": f"{BASE_URL}/",
    })

    r = session.get(url, allow_redirects=False, timeout=15)
    location = r.headers.get("location", "")

    print(f"[google-login] status: {r.status_code}")
    print(f"[google-login] location[:200]: {location[:200]}")

    if "CurrUser=" not in location:
        raise RuntimeError(
            f"AAO không trả CurrUser. "
            f"Status: {r.status_code} | Location: {location[:300]}"
        )

    # Parse đúng cách thay vì split thủ công
    # Location dạng: https://aao.eiu.edu.vn/#/home?CurrUser=xxx&gopage=
    # Phần sau # không được parse bởi urlparse nên tách thủ công
    fragment = location.split("#")[1] if "#" in location else ""
    # fragment dạng: /home?CurrUser=eyJ...&gopage=
    qs = fragment.split("?")[1] if "?" in fragment else ""
    params = parse_qs(qs)
    
    curr_user_encoded = params.get("CurrUser", [None])[0]
    if not curr_user_encoded:
        raise RuntimeError(f"Không tìm thấy CurrUser trong fragment: {fragment[:300]}")

    print(f"[google-login] CurrUser length: {len(curr_user_encoded)}")

    try:
        # Base64 decode trực tiếp (không phải URL encoded JSON)
        curr_user = json.loads(base64.b64decode(curr_user_encoded + "==").decode())
    except Exception as e:
        raise RuntimeError(f"Base64 decode thất bại: {e} | raw[:100]: {curr_user_encoded[:100]}")

    token = curr_user.get("access_token")
    if not token:
        raise RuntimeError(f"Không có access_token trong CurrUser")

    print(f"[google-login] OK! Token: {token[:40]}...")
    return _fetch_student_data(token)


# ==================== ROUTES ====================

@app.get("/")
def health():
    return {"status": "ok", "service": "EIU Student API", "version": "2.0.0"}


@app.post("/fetch-student")
async def fetch_student(req: LoginRequest):
    """Login bằng username + password."""
    loop = asyncio.get_event_loop()
    try:
        token, cookies = await loop.run_in_executor(
            _executor, _get_token_password, req.username, req.password
        )
        data = await loop.run_in_executor(
            _executor, _fetch_student_data, token, cookies
        )
        return {"success": True, "data": data}
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/fetch-student-google-access-token")
async def fetch_student_google_access_token(req: GoogleAccessTokenRequest):
    """
    Login bằng Google OAuth access_token (ya29.xxx).
    Frontend gửi access_token sau khi user đăng nhập Google.
    """
    loop = asyncio.get_event_loop()
    try:
        data = await loop.run_in_executor(
            _executor, _login_aao_with_access_token, req.access_token
        )
        return {"success": True, "data": data}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))