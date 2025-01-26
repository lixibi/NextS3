import sqlite3

def check_database():
    conn = sqlite3.connect('db/user_data.db')
    cursor = conn.cursor()
    
    print("=== 用户表 ===")
    cursor.execute("SELECT * FROM users")
    users = cursor.fetchall()
    for user in users:
        print(f"ID: {user[0]}")
        print(f"用户名: {user[1]}")
        print(f"密码: {user[2]}")
        print(f"VIP: {user[3]}")
        print(f"存储限制: {user[4]}")
        print(f"VIP到期时间: {user[5]}")
        print(f"创建时间: {user[6]}")
        print("---")
    
    print("\n=== 连接码表 ===")
    cursor.execute("SELECT * FROM connection_codes")
    codes = cursor.fetchall()
    for code in codes:
        print(f"ID: {code[0]}")
        print(f"用户ID: {code[1]}")
        print(f"连接码: {code[2]}")
        print(f"端点: {code[3]}")
        print(f"Access Key: {code[4]}")
        print(f"Secret Key: {code[5]}")
        print(f"Region: {code[6]}")
        print(f"Bucket: {code[7]}")
        print(f"描述: {code[8]}")
        print(f"创建时间: {code[9]}")
        print("---")
    
    conn.close()

if __name__ == "__main__":
    check_database() 