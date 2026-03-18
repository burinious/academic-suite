const { app, BrowserWindow, dialog } = require("electron");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const DIST_DIR = path.join(__dirname, "..", "dist");
const BACKEND_DIR = path.join(__dirname, "..", "..", "backend");
const BACKEND_HEALTH_URL = "http://127.0.0.1:8000/health";
const FRONTEND_PORT = 4176;
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`;

let mainWindow = null;
let frontendServer = null;
let backendProcess = null;
let backendStartedInternally = false;
let isQuitting = false;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function openUrl(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 500);
    });
    request.on("error", reject);
  });
}

async function waitForUrl(url, attempts = 60, delayMs = 500) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const reachable = await openUrl(url);
      if (reachable) {
        return true;
      }
    } catch {
      // Keep polling until timeout.
    }
    await sleep(delayMs);
  }
  return false;
}

function sendFile(response, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[extension] || "application/octet-stream";
  const content = fs.readFileSync(filePath);
  response.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": content.length,
  });
  response.end(content);
}

function createFrontendServer() {
  return http.createServer((request, response) => {
    const requestPath = (request.url || "/").split("?", 1)[0];
    const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
    const requestedFile = path.join(DIST_DIR, safePath);

    if (requestPath !== "/" && fs.existsSync(requestedFile) && fs.statSync(requestedFile).isFile()) {
      sendFile(response, requestedFile);
      return;
    }

    sendFile(response, path.join(DIST_DIR, "index.html"));
  });
}

function killBackendProcess() {
  if (!backendProcess || backendProcess.killed) {
    return;
  }

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(backendProcess.pid), "/t", "/f"]);
  } else {
    backendProcess.kill("SIGTERM");
  }
}

function ensureDistExists() {
  if (!fs.existsSync(path.join(DIST_DIR, "index.html"))) {
    throw new Error("Frontend build output was not found. Run npm run build first.");
  }
}

async function ensureBackendRunning() {
  const backendAlreadyRunning = await waitForUrl(BACKEND_HEALTH_URL, 2, 300);
  if (backendAlreadyRunning) {
    return;
  }

  backendStartedInternally = true;
  backendProcess = spawn(
    "python",
    ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
    {
      cwd: BACKEND_DIR,
      stdio: "pipe",
      windowsHide: true,
    },
  );

  backendProcess.stdout.on("data", (chunk) => {
    process.stdout.write(`[backend] ${chunk}`);
  });

  backendProcess.stderr.on("data", (chunk) => {
    process.stderr.write(`[backend] ${chunk}`);
  });

  backendProcess.on("error", (error) => {
    dialog.showErrorBox("Backend Startup Failed", error.message);
  });

  const backendReady = await waitForUrl(BACKEND_HEALTH_URL, 80, 500);
  if (!backendReady) {
    throw new Error("The backend did not become ready on http://127.0.0.1:8000.");
  }
}

async function ensureFrontendServerRunning() {
  frontendServer = createFrontendServer();
  await new Promise((resolve, reject) => {
    frontendServer.once("error", reject);
    frontendServer.listen(FRONTEND_PORT, "127.0.0.1", resolve);
  });
}

async function createMainWindow() {
  ensureDistExists();
  await ensureBackendRunning();
  await ensureFrontendServerRunning();

  mainWindow = new BrowserWindow({
    width: 1460,
    height: 940,
    minWidth: 1240,
    minHeight: 780,
    backgroundColor: "#07111f",
    autoHideMenuBar: true,
    title: "Academic Data Processing Suite",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  await mainWindow.loadURL(FRONTEND_URL);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    await createMainWindow();
  } catch (error) {
    dialog.showErrorBox("Desktop Startup Failed", error.message);
    app.quit();
  }
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createMainWindow();
  }
});

app.on("before-quit", () => {
  isQuitting = true;

  if (frontendServer) {
    frontendServer.close();
  }

  if (backendStartedInternally) {
    killBackendProcess();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  } else if (!isQuitting && backendStartedInternally) {
    killBackendProcess();
  }
});
