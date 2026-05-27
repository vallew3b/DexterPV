const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { Client } = require('pg');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handler para aprovisionar bases de datos
ipcMain.handle('provision-database', async (event, connectionString) => {
  try {
    // 1. Leer el script maestro
    const scriptPath = path.join(__dirname, 'dexter_schema.sql');
    const sqlScript = fs.readFileSync(scriptPath, 'utf8');

    // 2. Conectarse a la nueva base de datos del cliente
    const client = new Client({
      connectionString: connectionString,
      ssl: { rejectUnauthorized: false } // Requerido para Supabase
    });
    await client.connect();

    // 3. Ejecutar el script maestro completo
    await client.query(sqlScript);

    // 4. Cerrar conexión
    await client.end();

    return { success: true };
  } catch (err) {
    console.error('Error aprovisionando la base de datos:', err);
    return { success: false, error: err.message };
  }
});
