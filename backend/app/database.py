import sqlite3
import logging
from datetime import datetime

logger = logging.getLogger("uvicorn")

DB_NAME = "scans.db"

def init_db():
    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS scan_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT,
                extracted_text TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()
        conn.close()
        logger.info("Database initialized.")
    except Exception as e:
        logger.error(f"Database Init Error: {e}")

def save_scan_result(filename: str, text: str):
    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO scan_history (filename, extracted_text) VALUES (?, ?)",
            (filename, text)
        )
        conn.commit()
        scan_id = cursor.lastrowid
        conn.close()
        logger.info(f"Saved scan #{scan_id} to database.")
        return scan_id
    
    except Exception as e:
        logger.error(f"Database Save Error: {e}")
        return None