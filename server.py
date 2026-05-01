from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Query, UploadFile, File, Form, Depends, Header
from fastapi.responses import HTMLResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from pydantic import BaseModel, EmailStr, Field
import os
import io
import re
import uuid
import bcrypt
import jwt
import secrets
import hashlib
import logging
from datetime import datetime, timezone, timedelta


# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Config
GOOGLE_CLIENT_ID = os.environ['GOOGLE_CLIENT_ID']
GOOGLE_CLIENT_SECRET = os.environ['GOOGLE_CLIENT_SECRET']
GOOGLE_DRIVE_REDIRECT_URI = os.environ['GOOGLE_DRIVE_REDIRECT_URI']
FRONTEND_URL = os.environ['FRONTEND_URL']
DRIVE_FOLDER_ID = os.environ['DRIVE_FOLDER_ID']
JWT_SECRET = os.environ['JWT_SECRET']
ADMIN_EMAIL = os.environ['ADMIN_EMAIL']
ADMIN_PASSWORD = os.environ['ADMIN_PASSWORD']
ADMIN_NAME = os.environ.get('ADMIN_NAME', 'Administrator')

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

DRIVE_SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ============ Models ============
class RegisterReq(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    nama_lengkap: str = Field(min_length=2)

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    nama_lengkap: str
    role: str
    drive_folder_id: str | None = None
    unit_usaha: str | None = None

class AuthResp(BaseModel):
    access_token: str
    user: UserOut

class UpdateProfileReq(BaseModel):
    nama_lengkap: str = Field(min_length=2)
    unit_usaha: str | None = None

class UpdateDriveFolderReq(BaseModel):
    drive_folder_id: str | None = None  # None / empty string = pakai default folder

class ChangePasswordReq(BaseModel):
    old_password: str
    new_password: str = Field(min_length=6)

class RecoveryResetReq(BaseModel):
    email: EmailStr
    token: str
    new_password: str = Field(min_length=6)


# ============ Recovery token helpers ============
RECOVERY_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # exclude 0/O/1/I/L

def _generate_recovery_token() -> str:
    return "".join(secrets.choice(RECOVERY_ALPHABET) for _ in range(6))

def _hash_token(token: str) -> str:
    return hashlib.sha256(token.upper().strip().encode()).hexdigest()


# ============ Auth helpers ============
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(authorization: str = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Tidak terotentikasi")
    token = authorization[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token kedaluwarsa, silakan login ulang")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token tidak valid")

    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User tidak ditemukan")
    return user


# ============ Auth endpoints ============
@api_router.post("/auth/register", response_model=AuthResp)
async def register(body: RegisterReq):
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": email,
        "nama_lengkap": body.nama_lengkap.strip(),
        "password_hash": hash_password(body.password),
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    token = create_access_token(user_id, email)
    return AuthResp(access_token=token, user=_build_user_out(user_doc))

@api_router.post("/auth/login", response_model=AuthResp)
async def login(body: LoginReq):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email atau password salah")
    token = create_access_token(user["id"], user["email"])
    return AuthResp(access_token=token, user=_build_user_out(user))

@api_router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return _build_user_out(user)


@api_router.put("/auth/profile", response_model=UserOut)
async def update_profile(body: UpdateProfileReq, user: dict = Depends(get_current_user)):
    new_name = body.nama_lengkap.strip()
    set_data: dict = {"nama_lengkap": new_name, "updated_at": datetime.now(timezone.utc).isoformat()}
    if body.unit_usaha is not None:
        set_data["unit_usaha"] = body.unit_usaha.strip().upper()
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": set_data},
    )
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    fresh2 = await db.users.find_one({"id": user["id"]})
    return _build_user_out(fresh2 or {**user, "nama_lengkap": new_name})


@api_router.put("/auth/drive-folder", response_model=UserOut)
async def update_drive_folder(body: UpdateDriveFolderReq, user: dict = Depends(get_current_user)):
    raw = (body.drive_folder_id or "").strip()
    folder_id = _extract_folder_id(raw) if raw else ""
    if folder_id and not re.match(r"^[a-zA-Z0-9_\-]{10,}$", folder_id):
        raise HTTPException(status_code=400, detail="Folder ID tidak valid. Pastikan paste URL/ID dari folder Google Drive.")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"drive_folder_id": folder_id or None, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return _build_user_out(fresh or {**user, "drive_folder_id": folder_id or None})


@api_router.post("/auth/change-password")
async def change_password(body: ChangePasswordReq, user: dict = Depends(get_current_user)):
    full = await db.users.find_one({"id": user["id"]})
    if not full or not verify_password(body.old_password, full["password_hash"]):
        raise HTTPException(status_code=400, detail="Password lama salah")
    if body.old_password == body.new_password:
        raise HTTPException(status_code=400, detail="Password baru harus berbeda dari password lama")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password_hash": hash_password(body.new_password), "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"success": True}


# ============ Recovery token endpoints ============
@api_router.get("/auth/recovery/status")
async def recovery_status(user: dict = Depends(get_current_user)):
    full = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return {
        "has_token": bool(full and full.get("recovery_token_hash")),
        "generated_at": (full or {}).get("recovery_token_generated_at"),
    }


@api_router.post("/auth/recovery/generate")
async def recovery_generate(user: dict = Depends(get_current_user)):
    """Generate kode recovery 6 karakter (huruf+angka). Kalau user sudah punya token aktif,
    re-generate akan menggantikan (invalidate) token lama. Token plain HANYA dikembalikan sekali di response ini."""
    plain = _generate_recovery_token()
    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "recovery_token_hash": _hash_token(plain),
            "recovery_token_generated_at": now,
            "updated_at": now,
        }},
    )
    return {"token": plain, "generated_at": now}


@api_router.post("/auth/recovery/reset")
async def recovery_reset(body: RecoveryResetReq):
    """Public endpoint: user yang lupa password masukkan email + token + password baru.
    Token akan di-consume (dihapus) setelah berhasil reset, jadi user perlu generate ulang setelah login."""
    email = body.email.lower().strip()
    token = body.token.strip().upper()
    if len(token) != 6:
        raise HTTPException(status_code=400, detail="Kode recovery harus 6 karakter")
    user = await db.users.find_one({"email": email})
    invalid_msg = "Email atau kode recovery tidak valid"
    if not user or not user.get("recovery_token_hash"):
        raise HTTPException(status_code=400, detail=invalid_msg)
    if user["recovery_token_hash"] != _hash_token(token):
        raise HTTPException(status_code=400, detail=invalid_msg)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "password_hash": hash_password(body.new_password),
            "recovery_token_hash": None,
            "recovery_token_generated_at": None,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    return {"success": True}


# ============ Google Drive helpers ============
def _build_flow():
    return Flow.from_client_config(
        {"web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [GOOGLE_DRIVE_REDIRECT_URI],
        }},
        scopes=DRIVE_SCOPES,
        redirect_uri=GOOGLE_DRIVE_REDIRECT_URI,
    )

async def _get_drive_service(user_id: str):
    creds_doc = await db.drive_credentials.find_one({"user_id": user_id})
    if not creds_doc:
        raise HTTPException(status_code=400, detail="Google Drive belum terhubung. Silakan hubungkan terlebih dahulu.")
    creds = Credentials(
        token=creds_doc.get("access_token"),
        refresh_token=creds_doc.get("refresh_token"),
        token_uri=creds_doc["token_uri"],
        client_id=creds_doc["client_id"],
        client_secret=creds_doc["client_secret"],
        scopes=creds_doc.get("scopes"),
    )
    if creds.expired and creds.refresh_token:
        creds.refresh(GoogleRequest())
        await db.drive_credentials.update_one(
            {"user_id": user_id},
            {"$set": {
                "access_token": creds.token,
                "expiry": creds.expiry.isoformat() if creds.expiry else None,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
    return build('drive', 'v3', credentials=creds, cache_discovery=False)

def _extract_folder_id(value: str) -> str:
    """Ekstrak folder ID dari berbagai bentuk input:
    - URL: https://drive.google.com/drive/folders/<ID>?usp=sharing
    - URL dgn /u/0/: https://drive.google.com/drive/u/0/folders/<ID>
    - ID polos
    """
    v = (value or "").strip()
    if not v:
        return ""
    m = re.search(r"/folders/([a-zA-Z0-9_\-]+)", v)
    if m:
        return m.group(1)
    m = re.search(r"[?&]id=([a-zA-Z0-9_\-]+)", v)
    if m:
        return m.group(1)
    return v.split("?")[0].strip("/")


def _sanitize_filename(name: str) -> str:
    name = (name or "").strip()
    name = re.sub(r"[\\/:*?\"<>|\r\n\t]+", "_", name)
    return name or "rekaman"


def _build_user_out(user: dict) -> "UserOut":
    return UserOut(
        id=user["id"],
        email=user["email"],
        nama_lengkap=user["nama_lengkap"],
        role=user.get("role", "user"),
        drive_folder_id=user.get("drive_folder_id") or None,
        unit_usaha=user.get("unit_usaha") or None,
    )


# ============ Drive endpoints ============
@api_router.get("/")
async def root():
    return {"message": "SMH Voice Recorder API"}

@api_router.get("/drive/connect")
async def drive_connect(user: dict = Depends(get_current_user)):
    import secrets, hashlib, base64
    code_verifier = secrets.token_urlsafe(64)
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode()).digest()
    ).rstrip(b"=").decode()
    flow = _build_flow()
    authorization_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=user["id"],
        code_challenge=code_challenge,
        code_challenge_method="S256",
    )
    await db.oauth_verifiers.update_one(
        {"user_id": user["id"]},
        {"$set": {"user_id": user["id"], "code_verifier": code_verifier, "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"authorization_url": authorization_url}

@api_router.get("/drive/callback")
async def drive_callback(code: str = Query(...), state: str = Query(...)):
    try:
        # Ambil code_verifier dari DB
        verifier_doc = await db.oauth_verifiers.find_one({"user_id": state})
        code_verifier = verifier_doc.get("code_verifier") if verifier_doc else None

        flow = Flow.from_client_config(
            {"web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [GOOGLE_DRIVE_REDIRECT_URI],
            }},
            scopes=None,
            redirect_uri=GOOGLE_DRIVE_REDIRECT_URI,
        )
        if code_verifier:
            flow.fetch_token(code=code, code_verifier=code_verifier)
        else:
            flow.fetch_token(code=code)
        # Hapus verifier setelah dipakai
        await db.oauth_verifiers.delete_one({"user_id": state})
        creds = flow.credentials

        user_email = None
        try:
            oauth_service = build('oauth2', 'v2', credentials=creds, cache_discovery=False)
            user_email = (oauth_service.userinfo().get().execute() or {}).get('email')
        except Exception as e:
            logger.warning(f"Could not fetch user email: {e}")

        # state = user_id (from JWT context when initiating)
        user_doc = await db.users.find_one({"id": state}, {"_id": 0})
        if not user_doc:
            return HTMLResponse(content="""
            <!DOCTYPE html><html lang="id"><head><meta charset="utf-8" />
            <title>Sesi Tidak Valid</title>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background:#fff; color:#18181B; margin:0; display:flex; align-items:center; justify-content:center; min-height:100vh; padding:24px; }
              .card { max-width:440px; width:100%; border:4px solid #18181B; padding:32px; box-shadow:8px 8px 0 0 #18181B; text-align:center; }
              h1 { font-size:22px; margin:0 0 12px; font-weight:900; }
              p { font-size:14px; color:#52525B; margin:0 0 16px; line-height:1.5; }
              .badge { display:inline-block; background:#DC2626; color:#fff; padding:6px 12px; font-weight:700; font-size:12px; letter-spacing:0.15em; text-transform:uppercase; margin-bottom:16px; }
              button { background:#18181B; color:#fff; border:2px solid #18181B; padding:14px 24px; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; cursor:pointer; width:100%; box-shadow:4px 4px 0 0 #18181B; }
            </style></head>
            <body><div class="card">
              <span class="badge">Sesi Berakhir</span>
              <h1>Silakan Login Ulang</h1>
              <p>Sesi login Anda sudah berakhir atau akun tidak ditemukan. Tutup halaman ini, lalu logout & login ulang di aplikasi, kemudian coba HUBUNGKAN DRIVE lagi.</p>
              <button onclick="window.close();">TUTUP</button>
            </div></body></html>
            """, status_code=400)

        await db.drive_credentials.update_one(
            {"user_id": state},
            {"$set": {
                "user_id": state,
                "access_token": creds.token,
                "refresh_token": creds.refresh_token,
                "token_uri": creds.token_uri,
                "client_id": creds.client_id,
                "client_secret": creds.client_secret,
                "scopes": creds.scopes,
                "expiry": creds.expiry.isoformat() if creds.expiry else None,
                "email": user_email,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )

        success_html = f"""
        <!DOCTYPE html><html lang="id"><head><meta charset="utf-8" />
        <title>Drive Terhubung</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#fff; color:#18181B; margin:0; display:flex; align-items:center; justify-content:center; min-height:100vh; padding:24px; }}
          .card {{ max-width:440px; width:100%; border:4px solid #18181B; padding:32px; box-shadow:8px 8px 0 0 #18181B; }}
          h1 {{ font-size:26px; margin:0 0 12px; font-weight:900; }}
          p {{ font-size:15px; color:#52525B; margin:0 0 20px; line-height:1.5; }}
          .badge {{ display:inline-block; background:#059669; color:#fff; padding:6px 12px; font-weight:700; font-size:12px; letter-spacing:0.15em; text-transform:uppercase; margin-bottom:16px; }}
          .email {{ font-weight:700; color:#18181B; }}
          button {{ background:#18181B; color:#fff; border:2px solid #18181B; padding:14px 24px; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; cursor:pointer; width:100%; box-shadow:4px 4px 0 0 #18181B; }}
        </style></head>
        <body><div class="card">
          <span class="badge">Berhasil</span>
          <h1>Google Drive Terhubung</h1>
          <p>Akun <span class="email">{user_email or 'anda'}</span> sudah terhubung untuk user <strong>{user_doc.get('nama_lengkap', '')}</strong>. Silakan kembali ke aplikasi.</p>
          <button onclick="window.close(); setTimeout(function(){{ window.location.href='{FRONTEND_URL}'; }}, 200);">Tutup &amp; Kembali</button>
        </div></body></html>"""
        return HTMLResponse(content=success_html)
    except Exception as e:
        logger.error(f"OAuth callback failed: {e}")
        return HTMLResponse(content=f"<h2>OAuth Gagal</h2><p>{str(e)}</p><a href='{FRONTEND_URL}'>Kembali</a>", status_code=400)

@api_router.get("/drive/status")
async def drive_status(user: dict = Depends(get_current_user)):
    creds_doc = await db.drive_credentials.find_one({"user_id": user["id"]})
    if not creds_doc:
        return {"connected": False, "email": None}
    return {"connected": True, "email": creds_doc.get("email")}

@api_router.post("/drive/disconnect")
async def drive_disconnect(user: dict = Depends(get_current_user)):
    await db.drive_credentials.delete_one({"user_id": user["id"]})
    return {"success": True}

@api_router.post("/drive/upload")
async def drive_upload(
    nama_konsumen: str = Form(...),
    nomor_mesin: str = Form(...),
    file: UploadFile = File(...),
    file_type: str = Form(default="audio"),
    user: dict = Depends(get_current_user),
):
    if not nomor_mesin.strip():
        raise HTTPException(status_code=400, detail="Nomor Mesin SMH wajib diisi")
    if not nama_konsumen.strip():
        raise HTTPException(status_code=400, detail="Nama Konsumen wajib diisi")

    drive_service = await _get_drive_service(user["id"])

    # Root folder: pakai folder user kalau sudah di-set, fallback ke default
    root_folder = (user.get("drive_folder_id") or "").strip() or DRIVE_FOLDER_ID

    # Buat atau cari subfolder dengan nama nomor mesin
    safe_mesin = _sanitize_filename(nomor_mesin.strip())
    subfolder_id = None
    try:
        # Cari subfolder yang sudah ada
        query = f"name='{safe_mesin}' and mimeType='application/vnd.google-apps.folder' and '{root_folder}' in parents and trashed=false"
        results = drive_service.files().list(q=query, fields="files(id, name)", supportsAllDrives=True, includeItemsFromAllDrives=True).execute()
        folders = results.get("files", [])
        if folders:
            subfolder_id = folders[0]["id"]
        else:
            # Buat subfolder baru
            folder_meta = {
                "name": safe_mesin,
                "mimeType": "application/vnd.google-apps.folder",
                "parents": [root_folder],
            }
            created_folder = drive_service.files().create(body=folder_meta, fields="id", supportsAllDrives=True).execute()
            subfolder_id = created_folder.get("id")
    except Exception as e:
        logger.error(f"Gagal buat subfolder: {e}")
        subfolder_id = root_folder  # fallback ke root kalau gagal

    # Tentukan nama file berdasarkan tipe
    safe_nama = _sanitize_filename(nama_konsumen.strip())
    original_name = file.filename or "file"
    ext = os.path.splitext(original_name)[1] or ".mp3"
    if file_type == "cdb_photo":
        final_name = f"{safe_nama} - CDB{ext}"
        mimetype = file.content_type or "image/jpeg"
    else:
        final_name = f"{safe_nama}{ext}"
        mimetype = file.content_type or "audio/mpeg"

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="File kosong")

    media = MediaIoBaseUpload(io.BytesIO(file_bytes), mimetype=mimetype, resumable=False)
    file_metadata = {
        "name": final_name,
        "parents": [subfolder_id],
        "description": f"User: {user['nama_lengkap']} ({user['email']}) | Nama Konsumen: {nama_konsumen.strip()} | Nomor Mesin SMH: {nomor_mesin.strip()}",
    }

    try:
        created = drive_service.files().create(
            body=file_metadata, media_body=media, fields="id, name, webViewLink", supportsAllDrives=True,
        ).execute()
    except Exception as e:
        logger.error(f"Drive upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload gagal: {str(e)}")

    log_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_email": user["email"],
        "user_name": user["nama_lengkap"],
        "nama_konsumen": nama_konsumen.strip(),
        "nomor_mesin": nomor_mesin.strip(),
        "file_name": final_name,
        "file_type": file_type,
        "drive_file_id": created.get("id"),
        "drive_link": created.get("webViewLink"),
        "drive_folder_id": subfolder_id,
        "size_bytes": len(file_bytes),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.upload_logs.insert_one(log_doc)

    return {
        "success": True,
        "file_id": created.get("id"),
        "file_name": created.get("name"),
        "web_view_link": created.get("webViewLink"),
    }

@api_router.get("/uploads")
async def list_uploads(user: dict = Depends(get_current_user)):
    cursor = db.upload_logs.find(
        {"user_id": user["id"]},
        {"_id": 0, "user_id": 0},
    ).sort("uploaded_at", -1).limit(100)
    items = await cursor.to_list(length=100)
    return {"items": items}


@api_router.delete("/uploads/{upload_id}")
async def delete_upload(upload_id: str, user: dict = Depends(get_current_user)):
    # Hanya hapus catatan dari aplikasi, file di Drive tetap dipertahankan
    res = await db.upload_logs.delete_one({"id": upload_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Riwayat upload tidak ditemukan")
    return {"success": True}


# ============ Startup ============
async def seed_admin():
    existing = await db.users.find_one({"email": ADMIN_EMAIL.lower()})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": ADMIN_EMAIL.lower(),
            "nama_lengkap": ADMIN_NAME,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Admin user seeded: {ADMIN_EMAIL}")
    elif not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
        await db.users.update_one(
            {"email": ADMIN_EMAIL.lower()},
            {"$set": {"password_hash": hash_password(ADMIN_PASSWORD), "nama_lengkap": ADMIN_NAME}},
        )
        logger.info(f"Admin password updated: {ADMIN_EMAIL}")

@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.drive_credentials.create_index("user_id", unique=True)
    await db.upload_logs.create_index("user_id")
    await seed_admin()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
