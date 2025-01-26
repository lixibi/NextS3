import sqlite3
from datetime import datetime
import os
import json

# 确保db目录存在
if not os.path.exists('db'):
    os.makedirs('db')

# 连接到SQLite数据库
conn = sqlite3.connect('db/user_data.db')
cursor = conn.cursor()

# 创建用户表
cursor.execute('''
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    is_vip BOOLEAN DEFAULT 0,
    storage_limit INTEGER DEFAULT 104857600,  -- 默认100MB，以字节为单位
    vip_expire_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
)
''')

# 创建充值记录表
cursor.execute('''
CREATE TABLE IF NOT EXISTS payment_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_type TEXT NOT NULL,
    payment_time TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
)
''')

# 创建连接码表
cursor.execute('''
CREATE TABLE IF NOT EXISTS connection_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    code TEXT UNIQUE NOT NULL,
    config_json TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
)
''')

# 创建临时连接码表
cursor.execute('''
CREATE TABLE IF NOT EXISTS temp_connection_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    config_json TEXT NOT NULL,
    created_at DATETIME NOT NULL,
    UNIQUE(code)
)
''')

# 为临时连接码添加索引
cursor.execute('''
CREATE INDEX IF NOT EXISTS idx_temp_connection_codes_code ON temp_connection_codes(code)
''')

# 添加清理过期数据的触发器
cursor.execute('''
CREATE TRIGGER IF NOT EXISTS cleanup_temp_codes
AFTER INSERT ON temp_connection_codes
BEGIN
    DELETE FROM temp_connection_codes 
    WHERE created_at < datetime('now', '-7 days');
END
''')

# 插入一些测试数据
def insert_test_data():
    # 插入测试用户
    cursor.execute('''
    INSERT OR IGNORE INTO users (username, password, is_vip, storage_limit)
    VALUES (?, ?, ?, ?)
    ''', ('test', 'test123', 0, 104857600))
    
    # 获取用户ID
    cursor.execute('SELECT id FROM users WHERE username = ?', ('test',))
    user_id = cursor.fetchone()[0]
    
    # 插入测试连接码
    permanent_config = {
        "endpoint": "http://s.lixining.com:3009",
        "accessKey": "hebe",
        "secretKey": "Siling11.",
        "region": "us-east-1",
        "bucket": "hebes3"
    }
    
    cursor.execute('''
    INSERT OR IGNORE INTO connection_codes 
    (user_id, code, config_json, description)
    VALUES (?, ?, ?, ?)
    ''', (
        user_id,
        'hebeos',
        json.dumps(permanent_config),
        '测试连接码'
    ))
    
    # 插入测试临时连接码
    temp_config = {
        "endpoint": "http://test.example.com",
        "accessKey": "test-key",
        "secretKey": "test-secret",
        "region": "test-region",
        "bucket": "test-bucket"
    }
    cursor.execute('''
    INSERT OR IGNORE INTO temp_connection_codes (code, config_json, created_at)
    VALUES (?, ?, datetime('now'))
    ''', ('testcode', json.dumps(temp_config)))

# 插入测试数据
insert_test_data()

# 提交更改并关闭连接
conn.commit()
conn.close()

print("数据库初始化完成！") 