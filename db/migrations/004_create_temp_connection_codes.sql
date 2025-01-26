CREATE TABLE IF NOT EXISTS temp_connection_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    config_json TEXT NOT NULL,
    created_at DATETIME NOT NULL,
    UNIQUE(code)
);

-- 为临时连接码添加索引
CREATE INDEX IF NOT EXISTS idx_temp_connection_codes_code ON temp_connection_codes(code);

-- 添加清理过期数据的触发器（可选，7天后自动删除）
CREATE TRIGGER IF NOT EXISTS cleanup_temp_codes
AFTER INSERT ON temp_connection_codes
BEGIN
    DELETE FROM temp_connection_codes 
    WHERE created_at < datetime('now', '-7 days');
END; 