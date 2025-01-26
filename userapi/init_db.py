import sqlite3
from datetime import datetime
import os

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
    endpoint TEXT NOT NULL,
    access_key TEXT NOT NULL,
    secret_key TEXT NOT NULL,
    region TEXT NOT NULL,
    bucket TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
)
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
    cursor.execute('''
    INSERT OR IGNORE INTO connection_codes 
    (user_id, code, endpoint, access_key, secret_key, region, bucket, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        user_id,
        'hebeos',
        'http://s.lixining.com:3009',
        'hebe',
        'Siling11.',
        'us-east-1',
        'hebes3',
        '测试连接码'
    ))

# 插入测试数据
insert_test_data()

# 提交更改并关闭连接
conn.commit()
conn.close()

print("数据库初始化完成！") 