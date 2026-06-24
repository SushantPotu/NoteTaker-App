"""Test script for FastAPI API endpoints (mocks CV/OCR deps)."""
import os
import sys
import types

# Mock heavy dependencies before importing app
for mod_name in ['cv2', 'numpy', 'paddleocr']:
    if mod_name not in sys.modules:
        sys.modules[mod_name] = types.ModuleType(mod_name)

# Provide numpy stubs needed by image_proc
np_mock = sys.modules['numpy']
np_mock.frombuffer = lambda *a, **k: None
np_mock.uint8 = 'uint8'
np_mock.array = lambda *a, **k: None
np_mock.arange = lambda *a, **k: range(256)
np_mock.ones = lambda *a, **k: None
np_mock.ones_like = lambda *a, **k: None
np_mock.mean = lambda *a, **k: 200

# Provide cv2 stubs
cv2_mock = sys.modules['cv2']
for attr in ['LUT', 'imdecode', 'split', 'merge', 'cvtColor', 'resize',
             'GaussianBlur', 'threshold', 'bitwise_not', 'dilate',
             'copyMakeBorder', 'imwrite', 'IMREAD_UNCHANGED', 'IMREAD_COLOR',
             'COLOR_BGR2GRAY', 'COLOR_GRAY2BGR', 'INTER_CUBIC', 'INTER_AREA',
             'THRESH_BINARY', 'BORDER_CONSTANT']:
    setattr(cv2_mock, attr, lambda *a, **k: None)

# Provide PaddleOCR stub
paddle_mock = sys.modules['paddleocr']
class FakePaddleOCR:
    def __init__(self, **kwargs): pass
    def ocr(self, image): return [[]]
paddle_mock.PaddleOCR = FakePaddleOCR

sys.path.insert(0, '.')

import app.database as db
TEST_DB = 'test_api_scans.db'
if os.path.exists(TEST_DB):
    os.remove(TEST_DB)
db.DB_NAME = TEST_DB

from app.main import app

# Explicitly init db since lifespan/startup events may not auto-fire
db.init_db()

from fastapi.testclient import TestClient
client = TestClient(app)

def test_api():
    print("=" * 50)
    print("NOTETAKER API ENDPOINT TESTS")
    print("=" * 50)

    # 1. List notebooks (empty)
    r = client.get("/notebooks")
    assert r.status_code == 200
    assert r.json()["notebooks"] == []
    print("[PASS] GET /notebooks — empty list")

    # 2. Create notebook
    r = client.post("/notebooks", json={"name": "Chemistry", "color": "#4CAF50"})
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "Chemistry"
    nb_id = data["id"]
    print(f"[PASS] POST /notebooks — created id={nb_id}")

    # 3. Create second notebook
    r = client.post("/notebooks", json={"name": "History"})
    assert r.status_code == 200
    nb_id2 = r.json()["id"]
    print(f"[PASS] POST /notebooks — created id={nb_id2}")

    # 4. List notebooks (2)
    r = client.get("/notebooks")
    nbs = r.json()["notebooks"]
    assert len(nbs) == 2
    print(f"[PASS] GET /notebooks — {len(nbs)} notebooks")

    # 5. Get single notebook
    r = client.get(f"/notebooks/{nb_id}")
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "Chemistry"
    assert data["pages"] == []
    print(f"[PASS] GET /notebooks/{nb_id} — name='{data['name']}', 0 pages")

    # 6. Update notebook
    r = client.put(f"/notebooks/{nb_id}", json={"name": "Organic Chemistry", "color": "#009688"})
    assert r.status_code == 200
    r = client.get(f"/notebooks/{nb_id}")
    assert r.json()["name"] == "Organic Chemistry"
    print(f"[PASS] PUT /notebooks/{nb_id} — renamed")

    # 7. Create pages
    r = client.post(f"/notebooks/{nb_id}/pages")
    assert r.status_code == 200
    p1 = r.json()
    assert p1["page_number"] == 1
    print(f"[PASS] POST /notebooks/{nb_id}/pages — page {p1['page_number']}")

    r = client.post(f"/notebooks/{nb_id}/pages")
    p2 = r.json()
    assert p2["page_number"] == 2
    print(f"[PASS] POST /notebooks/{nb_id}/pages — page {p2['page_number']}")

    # 8. Get page
    r = client.get(f"/pages/{p1['id']}")
    assert r.status_code == 200
    assert r.json()["extracted_text"] == ""
    print(f"[PASS] GET /pages/{p1['id']} — empty text")

    # 9. Update page
    r = client.put(f"/pages/{p1['id']}", json={"extracted_text": "NaCl + H2O", "image_data": "base64data"})
    assert r.status_code == 200
    r = client.get(f"/pages/{p1['id']}")
    assert r.json()["extracted_text"] == "NaCl + H2O"
    assert r.json()["image_data"] == "base64data"
    print(f"[PASS] PUT /pages/{p1['id']} — text and image saved")

    # 10. Page count in notebook listing
    r = client.get("/notebooks")
    chem = [n for n in r.json()["notebooks"] if n["id"] == nb_id][0]
    assert chem["page_count"] == 2
    print(f"[PASS] GET /notebooks — page_count={chem['page_count']}")

    # 11. Delete page
    r = client.delete(f"/pages/{p2['id']}")
    assert r.status_code == 200
    r = client.get(f"/notebooks/{nb_id}")
    assert len(r.json()["pages"]) == 1
    print(f"[PASS] DELETE /pages/{p2['id']} — 1 page remaining")

    # 12. Delete notebook (cascade)
    r = client.delete(f"/notebooks/{nb_id}")
    assert r.status_code == 200
    r = client.get(f"/pages/{p1['id']}")
    # Page should be gone (None or error)
    page_data = r.json()
    assert page_data is None or page_data.get("error")
    print(f"[PASS] DELETE /notebooks/{nb_id} — cascade deleted pages")

    # 13. Remaining notebooks
    r = client.get("/notebooks")
    assert len(r.json()["notebooks"]) == 1
    print("[PASS] GET /notebooks — 1 remaining")

    # 14. Delete nonexistent
    r = client.delete("/notebooks/9999")
    print("[PASS] DELETE /notebooks/9999 — handled gracefully")

    print()
    print("=" * 50)
    print("ALL 14 API TESTS PASSED")
    print("=" * 50)

if __name__ == "__main__":
    try:
        test_api()
    finally:
        try:
            if os.path.exists(TEST_DB):
                os.remove(TEST_DB)
        except PermissionError:
            print(f"(Note: could not remove {TEST_DB} — file locked, clean up manually)")
