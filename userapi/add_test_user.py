import sqlite3

def add_test_user():
    conn = sqlite3.connect('db/user_data.db')
    cursor = conn.cursor()
    
    try:
        # 检查用户是否已存在
        cursor.execute('SELECT id FROM users WHERE username = ?', ('test',))
        existing_user = cursor.fetchone()
        
        if existing_user:
            user_id = existing_user[0]
            print("测试用户已存在，ID:", user_id)
        else:
            # 插入测试用户
            cursor.execute('''
            INSERT INTO users (username, password, is_vip, storage_limit)
            VALUES (?, ?, ?, ?)
            ''', ('test', 'test123', 0, 104857600))
            
            cursor.execute('SELECT id FROM users WHERE username = ?', ('test',))
            user_id = cursor.fetchone()[0]
            print("测试用户创建成功，ID:", user_id)

        # 检查连接码是否已存在
        cursor.execute('SELECT code FROM connection_codes WHERE code = ?', ('hebeos',))
        if not cursor.fetchone():
            # 插入测试连接码
            cursor.execute('''
            INSERT INTO connection_codes 
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
            print("测试连接码添加成功！")
        else:
            print("测试连接码已存在")
        
        conn.commit()
        print("操作完成！")
        
    except sqlite3.Error as e:
        print(f"数据库错误: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    add_test_user() 