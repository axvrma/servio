const { app, BrowserWindow, Menu, Tray, ipcMain, dialog, Notification } = require('electron');
const path = require('path');
const { exec, spawn } = require('child_process');
const fs = require("fs");

// Kill process tree (works on macOS/Linux)
const killProcessTree = (pid) => {
    try {
        if (process.platform === 'win32') {
            exec(`taskkill /pid ${pid} /T /F`);
        } else {
            // Kill the entire process group
            process.kill(-pid, 'SIGKILL');
        }
    } catch (e) {
        // Fallback: try regular kill
        try {
            process.kill(pid, 'SIGKILL');
        } catch (err) {
            console.log(`Process ${pid} already terminated`);
        }
    }
};

// Path to save the configuration file
const configPath = path.join(app.getPath("userData"), "servio-config.json");

let mainWindow;
let tray = null;
const processes = {};
const processOutputs = {};
const processMetadata = {};
const restartCounts = {};

const MAX_OUTPUT_LINES = 1000;
const MAX_RESTARTS = 5;
const RESTART_DELAY = 2000;
const RESTART_RESET_TIME = 60000;

// Load saved configurations
const loadConfig = () => {
    try {
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, "utf-8"));
        }
    } catch (error) {
        console.error("Failed to load config:", error);
    }
    return [];
};

// Save configurations
const saveConfig = (config) => {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
};

// Show system notification
const showNotification = (title, body, type = 'info') => {
    if (Notification.isSupported()) {
        const notification = new Notification({
            title,
            body,
            silent: type === 'info',
        });
        notification.show();
        
        notification.on('click', () => {
            if (mainWindow) {
                mainWindow.show();
                mainWindow.focus();
            }
        });
    }
};

// Append output to buffer
const appendOutput = (alias, data, isError = false) => {
    if (!processOutputs[alias]) {
        processOutputs[alias] = [];
    }
    
    const lines = data.toString().split('\n');
    const timestamp = new Date().toLocaleTimeString();
    
    lines.forEach(line => {
        if (line.trim()) {
            processOutputs[alias].push({
                text: line,
                isError,
                timestamp
            });
        }
    });
    
    // Keep only last MAX_OUTPUT_LINES
    if (processOutputs[alias].length > MAX_OUTPUT_LINES) {
        processOutputs[alias] = processOutputs[alias].slice(-MAX_OUTPUT_LINES);
    }
    
    // Send to renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("process-output", alias, { text: data.toString(), isError, timestamp });
    }
};

// Start a process
const startProcess = (alias, folder, command, isRestart = false) => {
    if (processes[alias]) {
        return { success: false, message: `Process for ${alias} is already running.` };
    }

    // Use spawn with shell to get proper process group handling
    const child = spawn(command, [], { 
        cwd: folder, 
        shell: true,
        detached: true,  // Create new process group so we can kill all children
    });
    processes[alias] = child;
    processOutputs[alias] = processOutputs[alias] || [];
    processMetadata[alias] = {
        startTime: Date.now(),
        status: 'running',
        lastExitCode: null
    };

    const startMsg = isRestart 
        ? `[Servio] Restarting process...` 
        : `[Servio] Starting: ${command}`;
    appendOutput(alias, startMsg + '\n', false);

    child.stdout.on("data", (data) => {
        appendOutput(alias, data, false);
    });

    child.stderr.on("data", (data) => {
        appendOutput(alias, data, true);
    });

    child.on("exit", (code, signal) => {
        const exitTime = Date.now();
        const runtime = processMetadata[alias] ? exitTime - processMetadata[alias].startTime : 0;
        
        processMetadata[alias] = {
            ...processMetadata[alias],
            status: code === 0 ? 'stopped' : 'error',
            lastExitCode: code,
            exitTime,
            runtime
        };

        delete processes[alias];
        
        const exitMsg = `[Servio] Process exited with code ${code}${signal ? ` (signal: ${signal})` : ''}`;
        appendOutput(alias, exitMsg + '\n', code !== 0);

        // Send process stopped event with metadata
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("process-stopped", alias, {
                exitCode: code,
                signal,
                runtime,
                wasError: code !== 0
            });
        }

        // Handle notifications and auto-restart
        const configs = loadConfig();
        const config = configs.find(c => c.alias === alias);
        
        if (code !== 0 && code !== null) {
            showNotification(
                `${alias} crashed`,
                `Process exited with code ${code}. ${config?.autoRestart ? 'Restarting...' : 'Click to view logs.'}`,
                'error'
            );

            // Auto-restart logic
            if (config?.autoRestart) {
                if (!restartCounts[alias]) {
                    restartCounts[alias] = { count: 0, firstRestartTime: Date.now() };
                }

                // Reset counter if enough time has passed
                if (Date.now() - restartCounts[alias].firstRestartTime > RESTART_RESET_TIME) {
                    restartCounts[alias] = { count: 0, firstRestartTime: Date.now() };
                }

                if (restartCounts[alias].count < MAX_RESTARTS) {
                    restartCounts[alias].count++;
                    appendOutput(alias, `[Servio] Auto-restart attempt ${restartCounts[alias].count}/${MAX_RESTARTS} in ${RESTART_DELAY/1000}s...\n`, false);
                    
                    setTimeout(() => {
                        if (!processes[alias]) {
                            startProcess(alias, config.folder, config.command, true);
                            updateTrayMenu();
                        }
                    }, RESTART_DELAY);
                } else {
                    appendOutput(alias, `[Servio] Max restart attempts (${MAX_RESTARTS}) reached. Stopping auto-restart.\n`, true);
                    showNotification(
                        `${alias} - Auto-restart disabled`,
                        `Max restart attempts reached. Please check the logs.`,
                        'error'
                    );
                }
            }
        } else if (code === 0) {
            // Reset restart counter on clean exit
            delete restartCounts[alias];
        }

        updateTrayMenu();
    });

    updateTrayMenu();
    return { success: true, message: `Process for ${alias} started.` };
};

// Update tray menu with process controls
const updateTrayMenu = () => {
    if (!tray) return;

    const configs = loadConfig();
    const processMenuItems = configs.map(config => {
        const isRunning = !!processes[config.alias];
        return {
            label: `${config.alias} ${isRunning ? '●' : '○'}`,
            submenu: [
                {
                    label: isRunning ? 'Stop' : 'Start',
                    click: () => {
                        if (isRunning) {
                            if (processes[config.alias]) {
                                killProcessTree(processes[config.alias].pid);
                                delete processes[config.alias];
                                updateTrayMenu();
                            }
                        } else {
                            startProcess(config.alias, config.folder, config.command);
                        }
                    }
                },
                {
                    label: 'View Logs',
                    click: () => {
                        mainWindow.show();
                        mainWindow.webContents.send('focus-process', config.alias);
                    }
                }
            ]
        };
    });

    const contextMenu = Menu.buildFromTemplate([
        {
            label: "Open Servio",
            click: () => {
                mainWindow.show();
            },
        },
        { type: 'separator' },
        ...processMenuItems,
        { type: 'separator' },
        {
            label: 'Start All',
            click: () => {
                configs.forEach(config => {
                    if (!processes[config.alias]) {
                        startProcess(config.alias, config.folder, config.command);
                    }
                });
            }
        },
        {
            label: 'Stop All',
            click: () => {
                Object.entries(processes).forEach(([alias, proc]) => {
                    if (proc && proc.pid) {
                        killProcessTree(proc.pid);
                        delete processes[alias];
                    }
                });
                updateTrayMenu();
            }
        },
        { type: 'separator' },
        {
            label: "Exit",
            click: () => {
                Object.entries(processes).forEach(([alias, proc]) => {
                    if (proc && proc.pid) {
                        killProcessTree(proc.pid);
                    }
                });
                app.isQuitting = true;
                app.quit();
            },
        },
    ]);

    tray.setContextMenu(contextMenu);
};

// Create the main window
const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 700,
        icon: path.join(__dirname, "assets", "icon.png"),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
        },
    });

    mainWindow.loadFile("index.html");

    mainWindow.on("close", (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.webContents.once("did-finish-load", () => {
        const configs = loadConfig();
        mainWindow.webContents.send("load-config", configs);
        
        // Send current process states
        const states = {};
        Object.keys(processes).forEach(alias => {
            states[alias] = {
                running: true,
                ...processMetadata[alias]
            };
        });
        mainWindow.webContents.send("load-process-states", states);
    });
};

// Create the system tray
const createTray = () => {
    // Use Template image for automatic dark/light mode support on macOS
    // Template images should be named with "Template" suffix
    const trayIconPath = path.join(__dirname, "assets", "tray-iconTemplate.png");
    tray = new Tray(trayIconPath);
    tray.setToolTip("Servio - Process Manager");
    
    updateTrayMenu();

    tray.on("double-click", () => {
        mainWindow.show();
    });
};

// Handle folder selection
ipcMain.handle("openFolderDialog", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ["openDirectory"]
    });
    return result.filePaths[0];
});

// Handle saving settings
ipcMain.on("save-settings", (event, config) => {
    const existingConfig = loadConfig();
    const newConfig = {
        alias: config.alias,
        folder: config.folderPath,
        command: config.command,
        autoRestart: config.autoRestart || false,
    };
    const index = existingConfig.findIndex((c) => c.alias === config.alias);
    if (index > -1) {
        existingConfig[index] = newConfig;
    } else {
        existingConfig.push(newConfig);
    }
    saveConfig(existingConfig);
    mainWindow.webContents.send("load-config", existingConfig);
    updateTrayMenu();
});

// Handle starting a process
ipcMain.handle("startProcess", (event, alias, folder, command) => {
    const result = startProcess(alias, folder, command);
    return result;
});

// Handle stopping a process
ipcMain.handle("stopProcess", (event, alias) => {
    if (processes[alias]) {
        const pid = processes[alias].pid;
        killProcessTree(pid);
        delete processes[alias];
        updateTrayMenu();
        return { success: true, message: `Process for ${alias} stopped.` };
    } else {
        return { success: false, message: `No running process found for ${alias}.` };
    }
});

// Handle getting process output
ipcMain.handle("getProcessOutput", (event, alias) => {
    return processOutputs[alias] || [];
});

// Handle clearing process output
ipcMain.handle("clearProcessOutput", (event, alias) => {
    processOutputs[alias] = [];
    return { success: true };
});

// Handle getting process metadata
ipcMain.handle("getProcessMetadata", (event, alias) => {
    return {
        ...processMetadata[alias],
        running: !!processes[alias]
    };
});

// Handle reordering configurations
ipcMain.handle("reorderConfigs", (event, orderedConfigs) => {
    saveConfig(orderedConfigs);
    updateTrayMenu();
    return { success: true };
});

// Handle deleting a configuration
ipcMain.handle("deleteConfig", (event, alias) => {
    let configs = loadConfig();

    const configIndex = configs.findIndex((config) => config.alias === alias);
    if (configIndex === -1) {
        return { success: false, message: `Config with alias ${alias} not found.` };
    }

    if (processes[alias]) {
        killProcessTree(processes[alias].pid);
        delete processes[alias];
    }

    delete processOutputs[alias];
    delete processMetadata[alias];
    delete restartCounts[alias];

    configs.splice(configIndex, 1);
    saveConfig(configs);
    updateTrayMenu();

    return { success: true, message: `Config for alias ${alias} deleted.` };
});

// Handle resetting restart counter
ipcMain.handle("resetRestartCounter", (event, alias) => {
    delete restartCounts[alias];
    return { success: true };
});

// App ready event
app.on("ready", () => {
    // Set dock icon on macOS
    if (process.platform === 'darwin') {
        const iconPath = path.join(__dirname, 'assets', 'icon.png');
        if (fs.existsSync(iconPath)) {
            app.dock.setIcon(iconPath);
        }
    }
    
    createWindow();
    createTray();
});

app.setLoginItemSettings({
    openAtLogin: true,
    path: app.getPath("exe"),
});

app.on("before-quit", () => {
    app.isQuitting = true;
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin" || app.isQuitting) {
        app.quit();
    }
});

app.on("quit", () => {
    Object.entries(processes).forEach(([alias, proc]) => {
        if (proc && proc.pid) {
            console.log(`Killing process: ${alias} (PID: ${proc.pid})`);
            killProcessTree(proc.pid);
        }
    });
});

// Also handle SIGINT and SIGTERM for graceful shutdown
process.on('SIGINT', () => {
    Object.entries(processes).forEach(([alias, proc]) => {
        if (proc && proc.pid) {
            killProcessTree(proc.pid);
        }
    });
    app.quit();
});

process.on('SIGTERM', () => {
    Object.entries(processes).forEach(([alias, proc]) => {
        if (proc && proc.pid) {
            killProcessTree(proc.pid);
        }
    });
    app.quit();
});
