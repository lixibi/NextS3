from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
# from fastapi.staticfiles import StaticFiles  # 暂时注释掉
from fastapi.templating import Jinja2Templates
from fastapi import Request
from pydantic import BaseModel
import sqlite3
from datetime import datetime
from typing import Optional, List
from contextlib import contextmanager
import threading
import hashlib
import base64
import json
import time

app = FastAPI()

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该设置具体的域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 添加模板支持
templates = Jinja2Templates(directory="templates")
# app.mount("/static", StaticFiles(directory="static"), name="static")  # 暂时注释掉

# 数据模型
class UserCreate(BaseModel):
    username: str
    password: str

class User(BaseModel):
    id: int
    username: str
    is_vip: bool
    storage_limit: int
    vip_expire_date: Optional[str] = None

class ConnectionCode(BaseModel):
    code: str
    endpoint: str
    access_key: str
    secret_key: str
    region: str
    bucket: str
    description: Optional[str] = None

class ConnectionCodeCreate(BaseModel):
    config_json: str  # 使用统一的JSON格式存储配置

class ConnectionCodeUpdate(BaseModel):
    config_json: Optional[str] = None
    description: Optional[str] = None

# 添加新的数据模型用于临时连接码
class TempConnectionCode(BaseModel):
    config_json: str  # 完整的配置JSON字符串

# 线程本地存储
thread_local = threading.local()

# 修改数据库连接管理
def get_db():
    db = sqlite3.connect('db/user_data.db')
    db.row_factory = sqlite3.Row  # 添加这行使结果可以通过列名访问
    return db  # 直接返回连接，不使用 yield

# API路由
@app.post("/api/register")
async def register(user: UserCreate):
    db = get_db()
    try:
        cursor = db.cursor()
        cursor.execute(
            "INSERT INTO users (username, password) VALUES (?, ?)",
            (user.username, user.password)
        )
        db.commit()
        return {"message": "注册成功"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="用户名已存在")
    finally:
        db.close()

@app.post("/api/login")
async def login(user: UserCreate):
    db = get_db()
    try:
        cursor = db.cursor()
        cursor.execute(
            "SELECT id, is_vip, storage_limit, vip_expire_date FROM users WHERE username = ? AND password = ?",
            (user.username, user.password)
        )
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=401, detail="用户名或密码错误")
        
        return {
            "id": result[0],
            "username": user.username,
            "is_vip": bool(result[1]),
            "storage_limit": result[2],
            "vip_expire_date": result[3]
        }
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail=f"数据库错误: {str(e)}")
    finally:
        db.close()

@app.get("/api/connection/{code}")
async def get_connection_config(code: str):
    db = get_db()
    try:
        cursor = db.cursor()
        
        # 统一查询两个表
        cursor.execute(
            """
            SELECT config_json, 'temp' as source FROM temp_connection_codes WHERE code = ?
            UNION ALL
            SELECT config_json, 'permanent' as source FROM connection_codes WHERE code = ?
            """,
            (code, code)
        )
        result = cursor.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="连接码不存在")
        
        try:
            config = json.loads(result[0])
            return {
                "endpoint": config["endpoint"],
                "accessKey": config["accessKey"],
                "secretKey": config["secretKey"],
                "region": config["region"],
                "bucket": config["bucket"]
            }
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="配置格式错误")
        
    except Exception as e:
        print(f"Error getting connection config: {e}")
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail="获取配置失败")
    finally:
        db.close()

@app.get("/api/user/{user_id}/codes")
async def get_user_codes(user_id: int):
    db = get_db()
    try:
        cursor = db.cursor()
        # 首先检查用户是否存在
        cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
        if not cursor.fetchone():
            print(f"User {user_id} not found")
            raise HTTPException(status_code=404, detail="用户不存在")

        cursor.execute(
            "SELECT code, description, created_at FROM connection_codes WHERE user_id = ?",
            (user_id,)
        )
        codes = cursor.fetchall()
        result = [
            {
                "code": code[0],
                "description": code[1],
                "created_at": code[2]
            }
            for code in codes
        ]
        print(f"Found {len(result)} codes for user {user_id}")
        return result
    except sqlite3.Error as e:
        print(f"Database error in get_user_codes: {e}")
        raise HTTPException(status_code=500, detail=f"数据库错误: {str(e)}")
    except Exception as e:
        print(f"Unexpected error in get_user_codes: {e}")
        raise HTTPException(status_code=500, detail=f"服务器错误: {str(e)}")
    finally:
        db.close()

@app.post("/api/user/{user_id}/codes")
async def create_connection_code(user_id: int, code: ConnectionCodeCreate):
    db = get_db()
    try:
        cursor = db.cursor()
        # 检查用户是否存在
        cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="用户不存在")

        # 生成唯一的连接码
        import random
        import string
        code_string = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
        
        # 检查连接码是否已存在
        cursor.execute("SELECT code FROM connection_codes WHERE code = ?", (code_string,))
        while cursor.fetchone():
            code_string = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
            cursor.execute("SELECT code FROM connection_codes WHERE code = ?", (code_string,))
        
        try:
            cursor.execute('''
            INSERT INTO connection_codes 
            (user_id, code, config_json, created_at)
            VALUES (?, ?, ?, datetime('now'))
            ''', (
                user_id,
                code_string,
                code.config_json
            ))
            db.commit()
            return {"message": "创建成功", "code": code_string}
        except sqlite3.Error as e:
            print(f"Error inserting code: {e}")
            db.rollback()
            raise
            
    except sqlite3.Error as e:
        print(f"Database error in create_connection_code: {e}")
        raise HTTPException(status_code=500, detail=f"数据库错误: {str(e)}")
    finally:
        db.close()

@app.put("/api/user/{user_id}/codes/{code}")
async def update_connection_code(
    user_id: int,
    code: str,
    update_data: ConnectionCodeUpdate
):
    db = get_db()
    try:
        cursor = db.cursor()
        # 检查连接码是否存在且属于该用户
        cursor.execute(
            "SELECT id FROM connection_codes WHERE user_id = ? AND code = ?",
            (user_id, code)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="连接码不存在或无权限")
        
        # 构建更新语句
        update_fields = []
        values = []
        for field, value in update_data.dict(exclude_unset=True).items():
            if value is not None:
                update_fields.append(f"{field} = ?")
                values.append(value)
        
        if update_fields:
            values.extend([user_id, code])
            cursor.execute(f'''
                UPDATE connection_codes 
                SET {", ".join(update_fields)}
                WHERE user_id = ? AND code = ?
            ''', values)
            db.commit()
        
        return {"message": "更新成功"}
    except sqlite3.Error as e:
        db.rollback()
        print(f"Database error: {e}")
        raise HTTPException(status_code=400, detail=f"数据库错误: {str(e)}")
    finally:
        db.close()

@app.delete("/api/user/{user_id}/codes/{code}")
async def delete_connection_code(user_id: int, code: str):
    db = get_db()
    try:
        cursor = db.cursor()
        # 检查连接码是否存在且属于该用户
        cursor.execute(
            "SELECT id FROM connection_codes WHERE user_id = ? AND code = ?",
            (user_id, code)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="连接码不存在或无权限")
        
        cursor.execute(
            "DELETE FROM connection_codes WHERE user_id = ? AND code = ?",
            (user_id, code)
        )
        db.commit()
        return {"message": "删除成功"}
    except sqlite3.Error as e:
        db.rollback()
        print(f"Database error: {e}")
        raise HTTPException(status_code=400, detail=f"数据库错误: {str(e)}")
    finally:
        db.close()

@app.get("/api/user/{user_id}/codes/{code}")
async def get_connection_code_detail(user_id: int, code: str):
    db = get_db()
    try:
        cursor = db.cursor()
        cursor.execute(
            """
            SELECT code, endpoint, access_key, secret_key, region, bucket, description 
            FROM connection_codes 
            WHERE user_id = ? AND code = ?
            """,
            (user_id, code)
        )
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="连接码不存在或无权限")
        
        # 打印调试信息
        print(f"Found code details: {result}")
        
        # 确保返回的字段名称与前端一致
        response_data = {
            "code": result[0],
            "endpoint": result[1],
            "access_key": result[2],
            "secret_key": result[3],
            "region": result[4],
            "bucket": result[5],
            "description": result[6] if result[6] is not None else ""
        }
        print(f"Returning data: {response_data}")
        return response_data
    except Exception as e:
        print(f"Error in get_connection_code_detail: {e}")
        raise
    finally:
        db.close()

# 添加页面路由
@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/register")
async def register_page(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})

@app.get("/dashboard")
async def dashboard(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request})

@app.post("/api/temp-codes")
async def create_temp_connection_code(config: ConnectionCodeCreate):
    db = get_db()
    try:
        # 先检查是否存在相同的配置
        cursor = db.cursor()
        cursor.execute("SELECT code FROM temp_connection_codes WHERE config_json = ?", (config.config_json,))
        existing_code = cursor.fetchone()
        
        if existing_code:
            return {"code": existing_code[0], "message": "已存在相同配置", "status": "existing"}
            
        # 生成新的链接码
        md5_hash = hashlib.md5(config.config_json.encode()).hexdigest()[:8]
        code = base64.b64encode(md5_hash.encode()).decode().replace('=', '')
        
        # 检查链接码是否已存在
        cursor.execute("SELECT code FROM temp_connection_codes WHERE code = ?", (code,))
        while cursor.fetchone():
            md5_hash = hashlib.md5((config.config_json + str(datetime.now().timestamp())).encode()).hexdigest()[:8]
            code = base64.b64encode(md5_hash.encode()).decode().replace('=', '')
            cursor.execute("SELECT code FROM temp_connection_codes WHERE code = ?", (code,))
        
        # 存储临时连接码
        cursor.execute('''
        INSERT INTO temp_connection_codes (code, config_json, created_at)
        VALUES (?, ?, datetime('now'))
        ''', (code, config.config_json))
        
        db.commit()
        return {"code": code, "message": "创建成功", "status": "created"}
    except sqlite3.Error as e:
        db.rollback()
        print(f"Database error in create_temp_connection_code: {e}")
        raise HTTPException(status_code=500, detail=f"数据库错误: {str(e)}")
    except Exception as e:
        print(f"Unexpected error in create_temp_connection_code: {e}")
        raise HTTPException(status_code=500, detail=f"服务器错误: {str(e)}")
    finally:
        db.close()

@app.get("/api/temp-codes/{code}")
async def get_temp_connection_config(code: str):
    db = get_db()
    try:
        cursor = db.cursor()
        cursor.execute(
            "SELECT config_json FROM temp_connection_codes WHERE code = ?",
            (code,)
        )
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="连接码不存在")
        
        return {"config": result[0]}
    finally:
        db.close()

@app.get("/api/time")
async def get_server_time():
    return {"serverTime": int(time.time() * 1000)}  # 返回毫秒级时间戳

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 