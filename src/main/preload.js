const { contextBridge, ipcRenderer } = require("electron");

const subscribe = (channel, callback) => {
    const listener = (event, ...args) => callback(...args);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld("electronAPI", {
    // Folder dialog
    openFolderDialog: () => ipcRenderer.invoke("openFolderDialog"),
    
    // Settings
    saveSettings: ({ alias, folder, command, autoRestart }) =>
        ipcRenderer.send("save-settings", { alias, folderPath: folder, command, autoRestart }),
    
    // Process control
    startProcess: (alias, folder, command) =>
        ipcRenderer.invoke("startProcess", alias, folder, command),
    stopProcess: (alias) => ipcRenderer.invoke("stopProcess", alias),
    
    // Process output
    getProcessOutput: (alias) => ipcRenderer.invoke("getProcessOutput", alias),
    clearProcessOutput: (alias) => ipcRenderer.invoke("clearProcessOutput", alias),
    openTerminalWindow: (alias) => ipcRenderer.invoke("openTerminalWindow", alias),
    onProcessOutput: (callback) => subscribe("process-output", callback),
    onProcessOutputCleared: (callback) => subscribe("process-output-cleared", callback),
    
    // Process metadata
    getProcessMetadata: (alias) => ipcRenderer.invoke("getProcessMetadata", alias),
    getProcessStates: () => ipcRenderer.invoke("getProcessStates"),
    resetRestartCounter: (alias) => ipcRenderer.invoke("resetRestartCounter", alias),
    
    // Events
    onProcessStarted: (callback) => subscribe("process-started", callback),
    onProcessStopping: (callback) => subscribe("process-stopping", callback),
    onProcessStopped: (callback) => subscribe("process-stopped", callback),
    onProcessRestarting: (callback) => subscribe("process-restarting", callback),
    onLoadConfig: (callback) => subscribe("load-config", callback),
    onLoadProcessStates: (callback) => subscribe("load-process-states", callback),
    onFocusProcess: (callback) => subscribe("focus-process", callback),
    
    // Config management
    deleteConfig: (alias) => ipcRenderer.invoke("deleteConfig", alias),
    reorderConfigs: (orderedConfigs) => ipcRenderer.invoke("reorderConfigs", orderedConfigs),
});
