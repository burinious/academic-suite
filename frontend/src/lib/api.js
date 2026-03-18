import {
  dashboardSummary,
  exportHistory,
  rules,
  templates,
} from "./mock-data";

function resolveApiBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname || "127.0.0.1";
    const loopbackHost = hostname === "::1" || hostname === "[::1]" ? "127.0.0.1" : hostname;
    return `${window.location.protocol}//${loopbackHost}:8000/api`;
  }

  return "http://127.0.0.1:8000/api";
}

const API_BASE_URL = resolveApiBaseUrl();
let authTokenProvider = null;

export function setAuthTokenProvider(provider) {
  authTokenProvider = provider;
}

function createApiError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function apiFetch(path, options = {}) {
  const { suppressUnauthorized = false, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers || {});

  if (authTokenProvider) {
    const token = await authTokenProvider();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers,
    ...fetchOptions,
  });

  if (response.status === 401 && !suppressUnauthorized) {
    window.dispatchEvent(new Event("adps:unauthorized"));
    throw createApiError("Your session has expired. Please sign in again.", "unauthorized");
  }

  return response;
}

async function request(path, fallback) {
  try {
    const response = await apiFetch(path);
    if (!response.ok) {
      throw createApiError(`Request failed: ${response.status}`, "request_failed");
    }

    return await response.json();
  } catch (error) {
    if (error.code === "unauthorized") {
      throw error;
    }
    return fallback;
  }
}

export function getDashboardSummary() {
  return request("/dashboard/summary", dashboardSummary);
}

export function getExportHistory() {
  return request("/exports/history", exportHistory);
}

export function getAuthStatus() {
  return request("/auth/status", { has_users: false, auth_provider: "local" });
}

export async function getCurrentUser() {
  const response = await apiFetch("/auth/me", { suppressUnauthorized: true });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw createApiError("Could not load your session.", "request_failed");
  }
  return response.json();
}

export async function registerUser(payload) {
  const response = await apiFetch("/auth/register", {
    suppressUnauthorized: true,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw createApiError(data?.detail || "Could not create account.", "request_failed");
  }

  return response.json();
}

export async function loginUser(payload) {
  const response = await apiFetch("/auth/login", {
    suppressUnauthorized: true,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw createApiError(data?.detail || "Could not sign in.", "request_failed");
  }

  return response.json();
}

export async function logoutUser() {
  const response = await apiFetch("/auth/logout", {
    suppressUnauthorized: true,
    method: "POST",
  });

  if (!response.ok && response.status !== 204) {
    throw createApiError("Could not log out.", "request_failed");
  }
}

export function getTemplates() {
  return request("/presets/templates", templates);
}

export async function saveTemplate(name, data) {
  const response = await apiFetch("/presets/templates", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, data }),
  });

  if (!response.ok) {
    throw new Error("Could not save template.");
  }

  return response.json();
}

export function getRules() {
  return request("/presets/rules", rules);
}

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiFetch("/files/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Upload failed.");
  }

  return response.json();
}

export async function uploadSampleFile() {
  const response = await apiFetch("/files/sample", {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Sample upload failed.");
  }

  return response.json();
}

export async function getFileSheets(fileId) {
  const response = await apiFetch(`/files/${fileId}/sheets`);
  if (!response.ok) {
    throw new Error("Could not load sheets.");
  }
  return response.json();
}

export async function getFilePreview(fileId, sheetName) {
  const params = new URLSearchParams();
  if (sheetName) {
    params.set("sheet_name", sheetName);
  }

  const response = await apiFetch(`/files/${fileId}/preview?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Could not load preview.");
  }
  return response.json();
}

export async function runSortMachine(payload) {
  const response = await apiFetch("/modules/sort-machine/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Sort Machine run failed.");
  }

  return response.json();
}

export function buildDownloadUrl(exportId) {
  return `${API_BASE_URL}/exports/${exportId}/download`;
}
