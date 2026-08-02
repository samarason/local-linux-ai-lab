const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Default environment variables for production desktop execution
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}
if (!process.env.PORT) {
  process.env.PORT = '3000';
}

let mainWindow;

// Helper function to resolve paths across packaged app.asar, unpacked app, or dev mode
function findFile(relativePath) {
  const candidatePaths = [];

  try {
    const appPath = app.getAppPath();
    candidatePaths.push(path.join(appPath, relativePath));
  } catch (e) {
    // app.getAppPath() might fail if called before app is ready
  }

  candidatePaths.push(
    path.join(__dirname, '..', relativePath),
    path.join(__dirname, relativePath),
    path.join(process.cwd(), relativePath),
    path.join(process.resourcesPath || '', 'app.asar', relativePath),
    path.join(process.resourcesPath || '', relativePath)
  );

  for (const p of candidatePaths) {
    if (p && fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

function startBackendServer() {
  const serverPath = findFile('dist/server.cjs');

  if (!serverPath) {
    console.error(`[Backend Server] Error: Compiled server bundle not found. Candidates checked relative to ${__dirname}`);
    return;
  }

  console.log(`[Backend Server] Found server bundle at: ${serverPath}`);

  try {
    // Require the compiled server bundle in-process
    require(serverPath);
    console.log('[Backend Server] Express server initialized in-process.');
  } catch (err) {
    console.error('[Backend Server] In-process require exception:', err);
    try {
      const { fork } = require('child_process');
      const serverProcess = fork(serverPath, [], {
        env: {
          ...process.env,
          PORT: process.env.PORT || '3000',
          NODE_ENV: 'production',
          ELECTRON_RUN_AS_NODE: '1',
        },
        stdio: 'pipe',
      });
      if (serverProcess.stdout) {
        serverProcess.stdout.on('data', (d) => console.log(`[Backend Server] ${d}`));
      }
      if (serverProcess.stderr) {
        serverProcess.stderr.on('data', (d) => console.error(`[Backend Server Err] ${d}`));
      }
    } catch (forkErr) {
      console.error('[Backend Server] Fork fallback failed:', forkErr);
    }
  }
}

function checkHealth(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(300, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function loadApplication(window) {
  const localHtmlPath = findFile('dist/index.html');
  const candidatePorts = [
    process.env.SERVED_PORT,
    process.env.PORT || '3000',
    '3000',
    '3001',
    '3002',
  ].filter(Boolean);

  let activePort = null;
  const maxAttempts = 30; // 30 x 200ms = 6s max total wait for Express server boot

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (!window || window.isDestroyed()) return;

    for (const port of candidatePorts) {
      const healthy = await checkHealth(port);
      if (healthy) {
        activePort = port;
        break;
      }
    }

    if (activePort) break;
    await new Promise((r) => setTimeout(r, 200));
  }

  if (activePort) {
    const serverUrl = `http://localhost:${activePort}`;
    console.log(`[Electron Main] Backend server active at ${serverUrl}. Loading application...`);
    window.loadURL(serverUrl).then(() => {
      if (window && !window.isDestroyed()) {
        window.show();
      }
    }).catch((err) => {
      console.error('[Electron Main] loadURL failed, falling back to local file:', err);
      loadFallback(window, localHtmlPath, serverUrl);
    });
  } else {
    console.warn('[Electron Main] Express server health check timed out. Loading local fallback...');
    loadFallback(window, localHtmlPath, `http://localhost:${candidatePorts[0] || '3000'}`);
  }
}

function loadFallback(window, localHtmlPath, serverUrl) {
  if (!window || window.isDestroyed()) return;
  if (localHtmlPath && fs.existsSync(localHtmlPath)) {
    console.log(`[Electron Main] Loading static fallback file at ${localHtmlPath}`);
    window.loadFile(localHtmlPath).then(() => {
      if (window && !window.isDestroyed()) window.show();
    }).catch((e) => console.error('[Electron Main] loadFile fallback error:', e));
  } else {
    console.log(`[Electron Main] Attempting loadURL fallback to ${serverUrl}`);
    window.loadURL(serverUrl).then(() => {
      if (window && !window.isDestroyed()) window.show();
    }).catch((e) => console.error('[Electron Main] Final loadURL error:', e));
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'local-linux-ai-lab - Local Linux AI Workstation',
    backgroundColor: '#0D0D0F',
    show: false, // Prevent black flash by waiting for ready-to-show or page load completion
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });

  loadApplication(mainWindow);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackendServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
