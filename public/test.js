// Open in a browser console (or paste contents) and run.
// Update BASE_URL to your API address.

const BASE_URL = "http://localhost:3005";

const state = {
  fileId: null,
};

const headersJson = (extra = {}) => ({
  "Content-Type": "application/json",
  ...extra,
});

const authHeader = () => ({});

const log = (label, data) => {
  console.log(`\n=== ${label} ===`);
  console.log(data);
};

const getFilenameFromDisposition = (disposition) => {
  if (!disposition) return null;
  const starMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (starMatch) return decodeURIComponent(starMatch[1]);
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match ? match[1] : null;
};

const api = {
  async signup(email, password) {
    const res = await fetch(`${BASE_URL}/signup`, {
      method: "POST",
      headers: headersJson(),
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    const data = await res.json();
    log("signup", { status: res.status, data });
    return data;
  },

  async signin(email, password) {
    const res = await fetch(`${BASE_URL}/signin`, {
      method: "POST",
      headers: headersJson(),
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    const data = await res.json();
    log("signin", { status: res.status, data });
    return data;
  },

  async refresh() {
    const res = await fetch(`${BASE_URL}/signin/new_token`, {
      method: "POST",
      headers: headersJson(),
      body: JSON.stringify({}),
      credentials: "include",
    });
    const data = await res.json();
    log("refresh", { status: res.status, data });
    return data;
  },

  async info() {
    const res = await fetch(`${BASE_URL}/info`, {
      method: "GET",
      headers: headersJson(authHeader()),
      credentials: "include",
    });
    const data = await res.json();
    log("info", { status: res.status, data });
    return data;
  },

  async uploadFile(file) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE_URL}/file/upload`, {
      method: "POST",
      headers: authHeader(),
      body: form,
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) state.fileId = data.id;
    log("upload", { status: res.status, data });
    return data;
  },

  async listFiles(listSize = 10, page = 1) {
    const params = new URLSearchParams({
      list_size: String(listSize),
      page: String(page),
    });
    const res = await fetch(`${BASE_URL}/file/list?${params}`, {
      method: "GET",
      headers: headersJson(authHeader()),
      credentials: "include",
    });
    const data = await res.json();
    log("list", { status: res.status, data });
    return data;
  },

  async getFile(id = state.fileId) {
    const res = await fetch(`${BASE_URL}/file/${id}`, {
      method: "GET",
      headers: headersJson(authHeader()),
      credentials: "include",
    });
    const data = await res.json();
    log("getFile", { status: res.status, data });
    return data;
  },

  async downloadFile(id = state.fileId) {
    const res = await fetch(`${BASE_URL}/file/download/${id}`, {
      method: "GET",
      headers: authHeader(),
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      log("downloadFile", { status: res.status, data });
      return null;
    }
    const disposition = res.headers.get("content-disposition");
    const filename =
      getFilenameFromDisposition(disposition) ||
      (id ? `file-${id}` : "download");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    log("downloadFile", { status: res.status, downloaded: true, filename });
    return blob;
  },

  async deleteFile(id = state.fileId) {
    const res = await fetch(`${BASE_URL}/file/delete/${id}`, {
      method: "DELETE",
      headers: headersJson(authHeader()),
      credentials: "include",
    });
    const data = await res.json();
    log("deleteFile", { status: res.status, data });
    return data;
  },

  async updateFile(id = state.fileId, file) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE_URL}/file/update/${id}`, {
      method: "PUT",
      headers: authHeader(),
      body: form,
      credentials: "include",
    });
    const data = await res.json();
    log("updateFile", { status: res.status, data });
    return data;
  },

  async logout() {
    const res = await fetch(`${BASE_URL}/logout`, {
      method: "GET",
      headers: headersJson(authHeader()),
      credentials: "include",
    });
    const data = await res.json();
    log("logout", { status: res.status, data });
    return data;
  },
};

window.api = api;
window.apiState = state;

// // Helpers for quick manual testing in browser console:
// api.signup("test@example.com", "password123").then(console.log).catch(console.error);
// api.signin("test@example.com", "password123")
// api.info()
// const file = document.querySelector("input[type=file]").files[0]; api.uploadFile(file)
// api.listFiles()
// api.getFile()
// api.downloadFile()
// api.updateFile(undefined, file)
// api.deleteFile()
// api.refresh()
// api.logout()
