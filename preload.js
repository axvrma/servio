const { contextBridge, ipcRenderer } = require("electron");

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
    onProcessOutput: (callback) => {
        ipcRenderer.on("process-output", (event, alias, output) => {
            callback(alias, output);
        });
    },
    
    // Process metadata
    getProcessMetadata: (alias) => ipcRenderer.invoke("getProcessMetadata", alias),
    resetRestartCounter: (alias) => ipcRenderer.invoke("resetRestartCounter", alias),
    
    // Events
    onProcessStopped: (callback) => {
        ipcRenderer.on("process-stopped", (event, alias, metadata) => {
            callback(alias, metadata);
        });
    },
    onLoadConfig: (callback) => 
        ipcRenderer.on("load-config", (event, configs) => callback(configs)),
    onLoadProcessStates: (callback) =>
        ipcRenderer.on("load-process-states", (event, states) => callback(states)),
    onFocusProcess: (callback) =>
        ipcRenderer.on("focus-process", (event, alias) => callback(alias)),
    
    // Config management
    deleteConfig: (alias) => ipcRenderer.invoke("deleteConfig", alias),
    reorderConfigs: (orderedConfigs) => ipcRenderer.invoke("reorderConfigs", orderedConfigs),
});
