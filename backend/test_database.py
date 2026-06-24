"""Test script for notebook/page database CRUD operations."""
import os
import sys

sys.path.insert(0, '.')
import app.database as db

# Use a test database
TEST_DB = 'test_scans.db'
if os.path.exists(TEST_DB):
    os.remove(TEST_DB)
db.DB_NAME = TEST_DB

def test_all():
    print("=" * 50)
    print("NOTETAKER DATABASE TESTS")
    print("=" * 50)

    # 1. Init DB
    db.init_db()
    print("[PASS] Database initialized")

    # 2. Create notebooks
    nb1 = db.create_notebook("Physics Notes", "#2196F3")
    assert nb1 is not None and nb1 > 0
    print(f"[PASS] Created notebook #1 (id={nb1})")

    nb2 = db.create_notebook("Math Notes", "#E91E63")
    assert nb2 is not None and nb2 > 0
    print(f"[PASS] Created notebook #2 (id={nb2})")

    # 3. List notebooks
    nbs = db.get_all_notebooks()
    assert len(nbs) == 2
    assert nbs[0]["page_count"] == 0
    print(f"[PASS] Listed {len(nbs)} notebooks, both with 0 pages")

    # 4. Get single notebook
    nb = db.get_notebook(nb1)
    assert nb is not None
    assert nb["name"] == "Physics Notes"
    assert nb["color"] == "#2196F3"
    assert len(nb["pages"]) == 0
    print(f"[PASS] Get notebook: name='{nb['name']}', color='{nb['color']}'")

    # 5. Rename notebook
    ok = db.rename_notebook(nb1, "Advanced Physics")
    assert ok
    nb = db.get_notebook(nb1)
    assert nb["name"] == "Advanced Physics"
    print(f"[PASS] Renamed notebook to '{nb['name']}'")

    # 6. Update color
    ok = db.update_notebook_color(nb1, "#FF9800")
    assert ok
    nb = db.get_notebook(nb1)
    assert nb["color"] == "#FF9800"
    print(f"[PASS] Updated color to '{nb['color']}'")

    # 7. Create pages
    p1 = db.create_page(nb1)
    assert p1["page_number"] == 1
    print(f"[PASS] Created page (id={p1['id']}, page_number={p1['page_number']})")

    p2 = db.create_page(nb1)
    assert p2["page_number"] == 2
    print(f"[PASS] Created page (id={p2['id']}, page_number={p2['page_number']})")

    p3 = db.create_page(nb1)
    assert p3["page_number"] == 3
    print(f"[PASS] Created page (id={p3['id']}, page_number={p3['page_number']})")

    # 8. Verify page count
    nbs = db.get_all_notebooks()
    physics = [n for n in nbs if n["id"] == nb1][0]
    assert physics["page_count"] == 3
    print(f"[PASS] Notebook page_count = {physics['page_count']}")

    # 9. Update page content
    ok = db.update_page(p1["id"], image_data="base64:AAABBB", extracted_text="Hello World")
    assert ok
    page = db.get_page(p1["id"])
    assert page["image_data"] == "base64:AAABBB"
    assert page["extracted_text"] == "Hello World"
    print(f"[PASS] Updated page: text='{page['extracted_text']}', has_image={bool(page['image_data'])}")

    # 10. Get notebook with pages
    nb = db.get_notebook(nb1)
    assert len(nb["pages"]) == 3
    assert nb["pages"][0]["extracted_text"] == "Hello World"
    print(f"[PASS] Notebook has {len(nb['pages'])} pages, first page text='{nb['pages'][0]['extracted_text']}'")

    # 11. Delete a page
    ok = db.delete_page(p3["id"])
    assert ok
    nb = db.get_notebook(nb1)
    assert len(nb["pages"]) == 2
    print(f"[PASS] Deleted page, notebook now has {len(nb['pages'])} pages")

    # 12. Get nonexistent page
    page = db.get_page(9999)
    assert page is None
    print("[PASS] Get nonexistent page returns None")

    # 13. Get nonexistent notebook
    nb = db.get_notebook(9999)
    assert nb is None
    print("[PASS] Get nonexistent notebook returns None")

    # 14. Delete notebook (cascade)
    ok = db.delete_notebook(nb1)
    assert ok
    nb = db.get_notebook(nb1)
    assert nb is None
    # Pages should be cascade-deleted
    page = db.get_page(p1["id"])
    assert page is None
    page = db.get_page(p2["id"])
    assert page is None
    print("[PASS] Deleted notebook, cascade deleted all pages")

    # 15. Remaining notebooks
    nbs = db.get_all_notebooks()
    assert len(nbs) == 1
    assert nbs[0]["name"] == "Math Notes"
    print(f"[PASS] 1 notebook remaining: '{nbs[0]['name']}'")

    # 16. Legacy scan_history still works
    scan_id = db.save_scan_result("test.png", "legacy text")
    assert scan_id is not None
    print(f"[PASS] Legacy save_scan_result works (id={scan_id})")

    print()
    print("=" * 50)
    print("ALL 16 TESTS PASSED")
    print("=" * 50)

if __name__ == "__main__":
    try:
        test_all()
    finally:
        if os.path.exists(TEST_DB):
            os.remove(TEST_DB)
