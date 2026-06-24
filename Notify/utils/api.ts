const API_BASE = 'http://192.168.29.183:8000';

// ---------- Notebooks ----------

export async function getNotebooks() {
  const res = await fetch(`${API_BASE}/notebooks`);
  const data = await res.json();
  return data.notebooks || [];
}

export async function createNotebook(name: string, color: string = '#673AB7') {
  const res = await fetch(`${API_BASE}/notebooks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color }),
  });
  return res.json();
}

export async function getNotebookWithPages(notebookId: number) {
  const res = await fetch(`${API_BASE}/notebooks/${notebookId}`);
  return res.json();
}

export async function renameNotebook(notebookId: number, name: string) {
  const res = await fetch(`${API_BASE}/notebooks/${notebookId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function deleteNotebook(notebookId: number) {
  const res = await fetch(`${API_BASE}/notebooks/${notebookId}`, {
    method: 'DELETE',
  });
  return res.json();
}

// ---------- Pages ----------

export async function createPage(notebookId: number) {
  const res = await fetch(`${API_BASE}/notebooks/${notebookId}/pages`, {
    method: 'POST',
  });
  return res.json();
}

export async function getPage(pageId: number) {
  const res = await fetch(`${API_BASE}/pages/${pageId}`);
  return res.json();
}

export async function updatePage(
  pageId: number,
  data: { image_data?: string; extracted_text?: string },
) {
  const res = await fetch(`${API_BASE}/pages/${pageId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deletePage(pageId: number) {
  const res = await fetch(`${API_BASE}/pages/${pageId}`, {
    method: 'DELETE',
  });
  return res.json();
}

// ---------- OCR Scan ----------

export async function scanImage(formData: FormData, pageId?: number) {
  let url = `${API_BASE}/scan`;
  if (pageId !== undefined) {
    url += `?page_id=${pageId}`;
  }
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}
