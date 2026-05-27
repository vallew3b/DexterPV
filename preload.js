const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  // Llama al motor interno para inyectar el SQL en la nueva BD
  provisionDatabase: (connectionString) => ipcRenderer.invoke('provision-database', connectionString),
  
  // Variable para que el frontend sepa que está corriendo dentro del .EXE
  isElectron: true
});
