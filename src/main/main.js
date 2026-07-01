const { app, BrowserWindow, Menu, Tray, ipcMain, dialog, Notification, nativeImage } = require('electron');
const path = require('path');
const { exec, spawn } = require('child_process');
const fs = require("fs");
const { promisify } = require('util');

const execAsync = promisify(exec);
const appRoot = path.join(__dirname, "..", "..");
const rendererIndexPath = path.join(appRoot, "src", "renderer", "index.html");
const terminalIndexPath = path.join(appRoot, "src", "terminal", "index.html");
const assetPath = (...segments) => path.join(appRoot, "assets", ...segments);

// Path to save the configuration file
const configPath = path.join(app.getPath("userData"), "servio-config.json");

let mainWindow;
let tray = null;
const terminalWindows = new Map();
const processes = {};
const processOutputs = {};
const processMetadata = {};
const restartCounts = {};
const stopRequests = new Map();
const restartTimers = {};
const partialOutput = {};

const MAX_OUTPUT_LINES = 1000;
const MAX_RESTARTS = 5;
const RESTART_DELAY = 2000;
const RESTART_RESET_TIME = 60000;
const KILL_GRACE_TIME = 3000;

const sendToRenderer = (channel, ...args) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, ...args);
    }

    terminalWindows.forEach((terminalWindow) => {
        if (!terminalWindow.isDestroyed()) {
            terminalWindow.webContents.send(channel, ...args);
        }
    });
};

const stripAnsi = (value) => value.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "");

const getChildPids = async (pid) => {
    if (process.platform === 'win32') return [];

    try {
        const { stdout } = await execAsync(`pgrep -P ${Number(pid)}`);
        return stdout
            .split(/\s+/)
            .map((value) => Number(value))
            .filter(Boolean);
    } catch {
        return [];
    }
};

const getDescendantPids = async (pid) => {
    const children = await getChildPids(pid);
    const descendants = [];

    for (const childPid of children) {
        descendants.push(childPid, ...(await getDescendantPids(childPid)));
    }

    return descendants;
};

const signalPid = (pid, signal) => {
    try {
        process.kill(pid, signal);
    } catch {
        // The process may already have exited.
    }
};

const terminateProcessTree = async (child, signal = 'SIGTERM') => {
    if (!child || !child.pid) return;

    if (process.platform === 'win32') {
        const force = signal === 'SIGKILL' ? '/F' : '';
        exec(`taskkill /pid ${child.pid} /T ${force}`.trim());
        return;
    }

    const pid = child.pid;
    const descendants = await getDescendantPids(pid);

    // Detached children are in their own process group. Target the group first,
    // then walk descendants as a fallback for tools that create another group.
    signalPid(-pid, signal);
    descendants.forEach((descendantPid) => signalPid(descendantPid, signal));
    signalPid(pid, signal);
};

const cancelRestart = (alias) => {
    if (restartTimers[alias]) {
        clearTimeout(restartTimers[alias]);
        delete restartTimers[alias];
    }
};

const showMainWindow = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    if (process.platform === 'darwin') {
        app.dock.show();
    }

    if (mainWindow.isMinimized()) {
        mainWindow.restore();
    }

    mainWindow.show();
    mainWindow.focus();
};

const hasVisibleTerminalWindow = () => Array.from(terminalWindows.values())
    .some((terminalWindow) => !terminalWindow.isDestroyed() && terminalWindow.isVisible());

const hideDockIfNoVisibleWindows = () => {
    if (process.platform !== 'darwin') return;

    const isMainVisible = mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible();
    if (!isMainVisible && !hasVisibleTerminalWindow()) {
        app.dock.hide();
    }
};

const createTerminalWindow = (alias) => {
    const existingWindow = terminalWindows.get(alias);
    if (existingWindow && !existingWindow.isDestroyed()) {
        existingWindow.show();
        existingWindow.focus();
        return { success: true, message: `Terminal window for ${alias} focused.` };
    }

    if (process.platform === 'darwin') {
        app.dock.show();
    }

    const terminalWindow = new BrowserWindow({
        width: 1000,
        height: 650,
        minWidth: 560,
        minHeight: 360,
        title: `${alias} Output - Servio`,
        icon: assetPath("icon.png"),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
        },
    });

    terminalWindows.set(alias, terminalWindow);
    terminalWindow.loadFile(terminalIndexPath, { query: { alias } });

    terminalWindow.on("closed", () => {
        terminalWindows.delete(alias);
        hideDockIfNoVisibleWindows();
    });

    return { success: true, message: `Terminal window for ${alias} opened.` };
};

const getProcessStates = () => {
    const states = {};

    Object.keys(processMetadata).forEach((alias) => {
        states[alias] = {
            ...processMetadata[alias],
            running: !!processes[alias],
            stopping: stopRequests.has(alias)
        };
    });

    return states;
};

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
            showMainWindow();
        });
    }
};

// Append output to buffer
const appendOutput = (alias, data, isError = false) => {
    if (!processOutputs[alias]) {
        processOutputs[alias] = [];
    }

    const raw = stripAnsi(data.toString()).replace(/\r/g, '\n');
    const combined = `${partialOutput[alias] || ''}${raw}`;
    const lines = combined.split('\n');
    const timestamp = new Date().toLocaleTimeString();

    partialOutput[alias] = raw.endsWith('\n') ? '' : lines.pop() || '';

    lines.forEach((line) => {
        const entry = {
            text: line,
            isError,
            timestamp
        };

        processOutputs[alias].push(entry);
        sendToRenderer("process-output", alias, entry);
    });

    // Keep only last MAX_OUTPUT_LINES
    if (processOutputs[alias].length > MAX_OUTPUT_LINES) {
        processOutputs[alias] = processOutputs[alias].slice(-MAX_OUTPUT_LINES);
    }
};

const flushPartialOutput = (alias, isError = false) => {
    if (!partialOutput[alias]) return;

    if (!processOutputs[alias]) {
        processOutputs[alias] = [];
    }

    const entry = {
        text: partialOutput[alias],
        isError,
        timestamp: new Date().toLocaleTimeString()
    };

    partialOutput[alias] = '';
    processOutputs[alias].push(entry);
    sendToRenderer("process-output", alias, entry);

    if (processOutputs[alias].length > MAX_OUTPUT_LINES) {
        processOutputs[alias] = processOutputs[alias].slice(-MAX_OUTPUT_LINES);
    }
};

// Start a process
const startProcess = (alias, folder, command, isRestart = false) => {
    if (processes[alias]) {
        return { success: false, message: `Process for ${alias} is already running.` };
    }

    if (!isRestart) {
        cancelRestart(alias);
        delete restartCounts[alias];
    }

    let child;
    try {
        // Use spawn with shell to support normal terminal commands while keeping
        // the shell in its own process group for reliable cleanup.
        child = spawn(command, [], {
            cwd: folder,
            shell: true,
            detached: process.platform !== 'win32',
        });
    } catch (error) {
        return { success: false, message: `Failed to start ${alias}: ${error.message}` };
    }

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
    sendToRenderer("process-started", alias, processMetadata[alias]);

    child.stdout?.on("data", (data) => {
        appendOutput(alias, data, false);
    });

    child.stderr?.on("data", (data) => {
        appendOutput(alias, data, true);
    });

    let handledExit = false;
    const handleProcessExit = (code, signal, spawnError = null) => {
        if (handledExit) return;
        handledExit = true;

        const exitTime = Date.now();
        const runtime = processMetadata[alias] ? exitTime - processMetadata[alias].startTime : 0;
        const stopRequest = stopRequests.get(alias);
        const wasManualStop = !!stopRequest;
        const wasKilledOrCrashed = !wasManualStop && (!!spawnError || code !== 0 || signal !== null);
        const configs = loadConfig();
        const config = configs.find(c => c.alias === alias);
        const willRestart = wasKilledOrCrashed && !!config?.autoRestart;

        if (stopRequest?.forceTimer) {
            clearTimeout(stopRequest.forceTimer);
        }
        stopRequests.delete(alias);
        
        processMetadata[alias] = {
            ...processMetadata[alias],
            status: wasKilledOrCrashed ? 'error' : 'stopped',
            lastExitCode: code,
            exitTime,
            runtime
        };

        if (processes[alias] === child) {
            delete processes[alias];
        }
        
        const exitReason = spawnError
            ? `failed to start: ${spawnError.message}`
            : `exited with code ${code}${signal ? ` (signal: ${signal})` : ''}`;
        flushPartialOutput(alias, wasKilledOrCrashed);
        appendOutput(alias, `[Servio] Process ${exitReason}\n`, wasKilledOrCrashed);

        // Send process stopped event with metadata
        sendToRenderer("process-stopped", alias, {
            exitCode: code,
            signal,
            runtime,
            wasError: wasKilledOrCrashed,
            wasManualStop,
            willRestart,
            status: processMetadata[alias].status
        });

        if (wasManualStop) {
            updateTrayMenu();
            return;
        }

        if (wasKilledOrCrashed) {
            const reason = spawnError ? spawnError.message : signal ? `killed by ${signal}` : `exited with code ${code}`;
            showNotification(
                `${alias} stopped`,
                `Process ${reason}. ${config?.autoRestart ? 'Restarting...' : 'Click to view logs.'}`,
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
                    processMetadata[alias] = {
                        ...processMetadata[alias],
                        status: 'restarting'
                    };
                    appendOutput(alias, `[Servio] Auto-restart attempt ${restartCounts[alias].count}/${MAX_RESTARTS} in ${RESTART_DELAY/1000}s...\n`, false);
                    sendToRenderer("process-restarting", alias, {
                        attempt: restartCounts[alias].count,
                        maxAttempts: MAX_RESTARTS,
                        delay: RESTART_DELAY
                    });

                    showNotification(
                        `Restarting ${alias}`,
                        `Auto-restart attempt ${restartCounts[alias].count}/${MAX_RESTARTS}`,
                        'info'
                    );
                    
                    restartTimers[alias] = setTimeout(() => {
                        delete restartTimers[alias];
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
    };

    child.once("error", (error) => {
        handleProcessExit(null, null, error);
    });

    child.once("close", (code, signal) => {
        handleProcessExit(code, signal);
    });

    updateTrayMenu();
    return { success: true, message: `Process for ${alias} started.` };
};

const requestProcessStop = (alias, reason = 'manual') => {
    const child = processes[alias];

    if (!child) {
        cancelRestart(alias);
        stopRequests.delete(alias);
        return { success: false, message: `No running process found for ${alias}.` };
    }

    if (stopRequests.has(alias)) {
        return { success: true, message: `Process for ${alias} is already stopping.` };
    }

    cancelRestart(alias);
    stopRequests.set(alias, { reason, requestedAt: Date.now(), forceTimer: null });
    processMetadata[alias] = {
        ...processMetadata[alias],
        status: 'stopping'
    };

    appendOutput(alias, `[Servio] Stopping process...\n`, false);
    sendToRenderer("process-stopping", alias, processMetadata[alias]);
    updateTrayMenu();

    terminateProcessTree(child, 'SIGTERM').catch((error) => {
        appendOutput(alias, `[Servio] Failed to request stop: ${error.message}\n`, true);
    });

    const stopRequest = stopRequests.get(alias);
    if (stopRequest) {
        stopRequest.forceTimer = setTimeout(() => {
            if (processes[alias] === child) {
                appendOutput(alias, `[Servio] Process did not stop gracefully. Forcing shutdown...\n`, true);
                terminateProcessTree(child, 'SIGKILL').catch((error) => {
                    appendOutput(alias, `[Servio] Failed to force stop: ${error.message}\n`, true);
                });
            }
        }, KILL_GRACE_TIME);
    }

    return { success: true, message: `Stopping process for ${alias}.` };
};

// Update tray menu with process controls
const updateTrayMenu = () => {
    if (!tray) return;

    const configs = loadConfig();
    const processMenuItems = configs.map(config => {
        const isRunning = !!processes[config.alias];
        const isStopping = stopRequests.has(config.alias);
        return {
            label: `${config.alias} ${isRunning ? isStopping ? '◐' : '●' : '○'}`,
            submenu: [
                {
                    label: isRunning ? isStopping ? 'Stopping...' : 'Stop' : 'Start',
                    enabled: !isStopping,
                    click: () => {
                        if (isRunning) {
                            requestProcessStop(config.alias);
                        } else {
                            startProcess(config.alias, config.folder, config.command);
                        }
                    }
                },
                {
                    label: 'View Logs',
                    click: () => {
                        showMainWindow();
                        mainWindow.webContents.send('focus-process', config.alias);
                    }
                },
                {
                    label: 'Open Logs Window',
                    click: () => {
                        createTerminalWindow(config.alias);
                    }
                }
            ]
        };
    });

    const contextMenu = Menu.buildFromTemplate([
        {
            label: "Open Servio",
            click: () => {
                showMainWindow();
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
                Object.keys(processes).forEach((alias) => requestProcessStop(alias));
                updateTrayMenu();
            }
        },
        { type: 'separator' },
        {
            label: "Exit",
            click: () => {
                app.isQuitting = true;
                Object.keys(processes).forEach((alias) => requestProcessStop(alias, 'quit'));
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
        icon: assetPath("icon.png"),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
        },
    });

    mainWindow.loadFile(rendererIndexPath);

    mainWindow.on("minimize", (event) => {
        event.preventDefault();
        mainWindow.hide();
        hideDockIfNoVisibleWindows();
    });

    mainWindow.on("show", () => {
        if (process.platform === 'darwin') {
            app.dock.show();
        }
    });

    mainWindow.on("close", (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            hideDockIfNoVisibleWindows();
        }
    });

    mainWindow.webContents.once("did-finish-load", () => {
        const configs = loadConfig();
        mainWindow.webContents.send("load-config", configs);
        mainWindow.webContents.send("load-process-states", getProcessStates());
    });
};

// Create the system tray
const createTray = () => {
    // Use Template image for automatic dark/light mode support on macOS
    // Template images should be named with "Template" suffix
    const trayIconPath = assetPath("tray-iconTemplate.png");
    tray = new Tray(trayIconPath);
    tray.setToolTip("Servio - Process Manager");
    
    updateTrayMenu();

    tray.on("double-click", () => {
        showMainWindow();
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
    return requestProcessStop(alias);
});

// Handle getting process output
ipcMain.handle("getProcessOutput", (event, alias) => {
    return processOutputs[alias] || [];
});

// Handle clearing process output
ipcMain.handle("clearProcessOutput", (event, alias) => {
    processOutputs[alias] = [];
    partialOutput[alias] = '';
    sendToRenderer("process-output-cleared", alias);
    return { success: true };
});

ipcMain.handle("openTerminalWindow", (event, alias) => {
    return createTerminalWindow(alias);
});

// Handle getting process metadata
ipcMain.handle("getProcessMetadata", (event, alias) => {
    return {
        ...processMetadata[alias],
        running: !!processes[alias],
        stopping: stopRequests.has(alias)
    };
});

ipcMain.handle("getProcessStates", () => getProcessStates());

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
        requestProcessStop(alias);
    }

    delete processOutputs[alias];
    delete processMetadata[alias];
    delete restartCounts[alias];
    delete partialOutput[alias];
    cancelRestart(alias);

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
        const iconPath = assetPath('icon.icns');
        const fallbackIconPath = assetPath('icon.png');
        const dockIconPath = fs.existsSync(iconPath) ? iconPath : fallbackIconPath;
        const dockIcon = nativeImage.createFromPath(dockIconPath);
        if (!dockIcon.isEmpty()) {
            app.dock.setIcon(dockIcon);
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
            terminateProcessTree(proc, 'SIGKILL');
        }
    });
});

// Also handle SIGINT and SIGTERM for graceful shutdown
process.on('SIGINT', () => {
    Object.entries(processes).forEach(([alias, proc]) => {
        if (proc && proc.pid) {
            terminateProcessTree(proc, 'SIGKILL');
        }
    });
    app.quit();
});

process.on('SIGTERM', () => {
    Object.entries(processes).forEach(([alias, proc]) => {
        if (proc && proc.pid) {
            terminateProcessTree(proc, 'SIGKILL');
        }
    });
    app.quit();
});
