import sqlite3
import logging
from datetime import datetime

logger = logging.getLogger("uvicorn")

DB_NAME = "scans.db"


def get_conn():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    try:
        conn = get_conn()
        cursor = conn.cursor()

        # Original scan_history table (kept for backward compatibility)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS scan_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT,
                extracted_text TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Notebooks table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS notebooks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                color TEXT DEFAULT '#673AB7',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Pages table (belongs to a notebook)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS pages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                notebook_id INTEGER NOT NULL,
                page_number INTEGER NOT NULL,
                image_data TEXT,
                extracted_text TEXT DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE
            )
        ''')

        conn.commit()
        conn.close()
        logger.info("Database initialized (notebooks + pages tables ready).")
    except Exception as e:
        logger.error(f"Database Init Error: {e}")


# ---------- Legacy ----------

def save_scan_result(filename: str, text: str):
    try:
        conn = get_conn()
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


# ---------- Notebooks CRUD ----------

def create_notebook(name: str, color: str = "#673AB7"):
    conn = get_conn()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()
    cursor.execute(
        "INSERT INTO notebooks (name, color, created_at, updated_at) VALUES (?, ?, ?, ?)",
        (name, color, now, now)
    )
    conn.commit()
    notebook_id = cursor.lastrowid
    conn.close()
    logger.info(f"Created notebook #{notebook_id}: '{name}'")
    return notebook_id


def get_all_notebooks():
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT n.id, n.name, n.color, n.created_at, n.updated_at,
               COUNT(p.id) as page_count
        FROM notebooks n
        LEFT JOIN pages p ON p.notebook_id = n.id
        GROUP BY n.id
        ORDER BY n.updated_at DESC
    ''')
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_notebook(notebook_id: int):
    conn = get_conn()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM notebooks WHERE id = ?", (notebook_id,))
    notebook = cursor.fetchone()
    if not notebook:
        conn.close()
        return None

    cursor.execute(
        "SELECT * FROM pages WHERE notebook_id = ? ORDER BY page_number ASC",
        (notebook_id,)
    )
    pages = cursor.fetchall()
    conn.close()

    result = dict(notebook)
    result["pages"] = [dict(p) for p in pages]
    return result


def rename_notebook(notebook_id: int, name: str):
    conn = get_conn()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()
    cursor.execute(
        "UPDATE notebooks SET name = ?, updated_at = ? WHERE id = ?",
        (name, now, notebook_id)
    )
    conn.commit()
    updated = cursor.rowcount
    conn.close()
    return updated > 0


def update_notebook_color(notebook_id: int, color: str):
    conn = get_conn()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()
    cursor.execute(
        "UPDATE notebooks SET color = ?, updated_at = ? WHERE id = ?",
        (color, now, notebook_id)
    )
    conn.commit()
    updated = cursor.rowcount
    conn.close()
    return updated > 0


def delete_notebook(notebook_id: int):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM notebooks WHERE id = ?", (notebook_id,))
    conn.commit()
    deleted = cursor.rowcount
    conn.close()
    logger.info(f"Deleted notebook #{notebook_id} (cascade deletes pages)")
    return deleted > 0


# ---------- Pages CRUD ----------

def create_page(notebook_id: int):
    conn = get_conn()
    cursor = conn.cursor()

    # Auto-assign next page number
    cursor.execute(
        "SELECT COALESCE(MAX(page_number), 0) + 1 FROM pages WHERE notebook_id = ?",
        (notebook_id,)
    )
    next_page = cursor.fetchone()[0]

    now = datetime.utcnow().isoformat()
    cursor.execute(
        "INSERT INTO pages (notebook_id, page_number, created_at, updated_at) VALUES (?, ?, ?, ?)",
        (notebook_id, next_page, now, now)
    )
    conn.commit()
    page_id = cursor.lastrowid

    # Touch notebook updated_at
    cursor.execute(
        "UPDATE notebooks SET updated_at = ? WHERE id = ?",
        (now, notebook_id)
    )
    conn.commit()
    conn.close()

    logger.info(f"Created page #{page_id} (page {next_page}) in notebook #{notebook_id}")
    return {"id": page_id, "page_number": next_page}


def get_page(page_id: int):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM pages WHERE id = ?", (page_id,))
    page = cursor.fetchone()
    conn.close()
    return dict(page) if page else None


def update_page(page_id: int, image_data: str = None, extracted_text: str = None):
    conn = get_conn()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()

    updates = []
    params = []

    if image_data is not None:
        updates.append("image_data = ?")
        params.append(image_data)
    if extracted_text is not None:
        updates.append("extracted_text = ?")
        params.append(extracted_text)

    updates.append("updated_at = ?")
    params.append(now)
    params.append(page_id)

    cursor.execute(
        f"UPDATE pages SET {', '.join(updates)} WHERE id = ?",
        params
    )

    # Also touch the parent notebook's updated_at
    cursor.execute(
        """UPDATE notebooks SET updated_at = ? 
           WHERE id = (SELECT notebook_id FROM pages WHERE id = ?)""",
        (now, page_id)
    )

    conn.commit()
    updated = cursor.rowcount
    conn.close()
    return updated > 0


def delete_page(page_id: int):
    conn = get_conn()
    cursor = conn.cursor()

    # Get notebook_id before deleting for timestamp update
    cursor.execute("SELECT notebook_id FROM pages WHERE id = ?", (page_id,))
    row = cursor.fetchone()

    cursor.execute("DELETE FROM pages WHERE id = ?", (page_id,))
    conn.commit()
    deleted = cursor.rowcount

    if row and deleted:
        now = datetime.utcnow().isoformat()
        cursor.execute(
            "UPDATE notebooks SET updated_at = ? WHERE id = ?",
            (now, row["notebook_id"])
        )
        conn.commit()

    conn.close()
    logger.info(f"Deleted page #{page_id}")
    return deleted > 0