import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    PlayArrow as StartIcon,
    Stop as StopIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Terminal as TerminalIcon,
    Clear as ClearIcon,
    Refresh as RefreshIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    RadioButtonUnchecked as StoppedIcon,
    Loop as RestartingIcon,
    DragIndicator as DragIcon,
    PlaylistPlay as StartAllIcon,
    StopCircle as StopAllIcon,
    FolderOpen as FolderIcon,
    Info as InfoIcon,
    Close as CloseIcon,
    Favorite as FavoriteIcon,
    GitHub as GitHubIcon,
} from "@mui/icons-material";
import {
    AppBar,
    Box,
    Button,
    Checkbox,
    Chip,
    Collapse,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Fab,
    FormControlLabel,
    Grid,
    IconButton,
    Link,
    List,
    ListItem,
    Paper,
    Snackbar,
    Alert,
    TextField,
    Toolbar,
    Tooltip,
    Typography,
    ThemeProvider,
    createTheme,
    CssBaseline,
    alpha,
    useMediaQuery,
    Card,
    CardContent,
    CardActions,
    Divider,
    Stack,
} from "@mui/material";
import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import posthog from "posthog-js";

// Initialize PostHog
posthog.init('phc_xNrMGr9sZ36QAhi7tcWoDoLYASkc7mRcWmMAa0NWES2', {
    api_host: 'https://us.i.posthog.com',
    autocapture: true,
    capture_pageview: true,
});

// Send test event immediately
posthog.capture('app_initialized', { app_name: 'Servio', version: '1.0.0' });

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#6750A4',
            light: '#EADDFF',
            dark: '#21005D',
            contrastText: '#FFFFFF',
        },
        secondary: {
            main: '#625B71',
            light: '#E8DEF8',
            dark: '#1D192B',
        },
        tertiary: {
            main: '#7D5260',
            light: '#FFD8E4',
            dark: '#31111D',
        },
        error: {
            main: '#B3261E',
            light: '#F9DEDC',
            dark: '#8C1D18',
        },
        success: {
            main: '#386A20',
            light: '#C4EED0',
            dark: '#1E4620',
        },
        warning: {
            main: '#7D5700',
            light: '#FFDEA8',
        },
        background: {
            default: '#FEF7FF',
            paper: '#FFFFFF',
        },
        surface: {
            main: '#FEF7FF',
            variant: '#E7E0EC',
        },
        outline: {
            main: '#79747E',
            variant: '#CAC4D0',
        },
    },
    typography: {
        fontFamily: '"Google Sans", "Roboto", "Helvetica", "Arial", sans-serif',
        h6: {
            fontWeight: 500,
            letterSpacing: 0.15,
        },
        subtitle1: {
            fontWeight: 500,
            letterSpacing: 0.15,
        },
        body2: {
            letterSpacing: 0.25,
        },
        caption: {
            letterSpacing: 0.4,
        },
        button: {
            textTransform: 'none',
            fontWeight: 500,
            letterSpacing: 0.1,
        },
    },
    shape: {
        borderRadius: 16,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 20,
                    padding: '10px 24px',
                },
                contained: {
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                    },
                },
                outlined: {
                    borderWidth: 1,
                },
            },
        },
        MuiFab: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    boxShadow: '0 3px 5px -1px rgba(0,0,0,0.1), 0 6px 10px 0 rgba(0,0,0,0.07), 0 1px 18px 0 rgba(0,0,0,0.06)',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    boxShadow: 'none',
                    border: '1px solid',
                    borderColor: '#CAC4D0',
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    fontWeight: 500,
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: 28,
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 12,
                    },
                },
            },
        },
        MuiIconButton: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    boxShadow: 'none',
                },
            },
        },
    },
});

const formatUptime = (ms) => {
    if (!ms) return '';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
};

const TerminalViewer = ({ alias, isOpen, onClear }) => {
    const [output, setOutput] = useState([]);
    const terminalRef = useRef(null);
    const [autoScroll, setAutoScroll] = useState(true);

    useEffect(() => {
        if (isOpen) {
            window.electronAPI.getProcessOutput(alias).then(setOutput);
        }
    }, [alias, isOpen]);

    useEffect(() => {
        const handleOutput = (outputAlias, data) => {
            if (outputAlias === alias) {
                setOutput(prev => [...prev, data]);
            }
        };
        window.electronAPI.onProcessOutput(handleOutput);
    }, [alias]);

    useEffect(() => {
        if (autoScroll && terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [output, autoScroll]);

    const handleClear = async () => {
        await window.electronAPI.clearProcessOutput(alias);
        setOutput([]);
        onClear?.();
    };

    if (!isOpen) return null;

    return (
        <Box 
            sx={{ 
                bgcolor: '#1C1B1F', 
                borderRadius: 3,
                overflow: 'hidden',
                mx: 2,
                mb: 2,
            }}
        >
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                px: 2,
                py: 1,
                bgcolor: '#2B2930',
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TerminalIcon sx={{ fontSize: 18, color: '#CAC4D0' }} />
                    <Typography variant="caption" sx={{ color: '#CAC4D0', fontWeight: 500 }}>
                        Output • {output.length} lines
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FormControlLabel
                        control={
                            <Checkbox 
                                size="small" 
                                checked={autoScroll} 
                                onChange={(e) => setAutoScroll(e.target.checked)}
                                sx={{ 
                                    color: '#CAC4D0',
                                    '&.Mui-checked': { color: '#D0BCFF' },
                                    p: 0.5
                                }}
                            />
                        }
                        label={<Typography variant="caption" sx={{ color: '#CAC4D0' }}>Auto-scroll</Typography>}
                        sx={{ mr: 0 }}
                    />
                    <Tooltip title="Clear output">
                        <IconButton size="small" onClick={handleClear} sx={{ color: '#CAC4D0' }}>
                            <ClearIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>
            <Box 
                ref={terminalRef}
                sx={{ 
                    height: 220, 
                    overflow: 'auto',
                    p: 2,
                    fontFamily: '"JetBrains Mono", "Fira Code", Monaco, monospace',
                    fontSize: 12,
                    lineHeight: 1.6,
                    '&::-webkit-scrollbar': {
                        width: 8,
                    },
                    '&::-webkit-scrollbar-track': {
                        bgcolor: 'transparent',
                    },
                    '&::-webkit-scrollbar-thumb': {
                        bgcolor: '#49454F',
                        borderRadius: 4,
                    },
                }}
            >
                {output.length === 0 ? (
                    <Typography variant="caption" sx={{ color: '#938F99', fontStyle: 'italic' }}>
                        No output yet. Start the process to see logs here.
                    </Typography>
                ) : (
                    output.map((line, idx) => (
                        <Box 
                            key={idx} 
                            sx={{ 
                                color: line.isError ? '#F2B8B5' : '#E6E1E5',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                            }}
                        >
                            <Typography 
                                component="span" 
                                sx={{ 
                                    color: '#938F99', 
                                    fontSize: 10, 
                                    mr: 1.5,
                                    fontFamily: 'inherit'
                                }}
                            >
                                {line.timestamp}
                            </Typography>
                            {line.text}
                        </Box>
                    ))
                )}
            </Box>
        </Box>
    );
};

const StatusChip = ({ status, uptime }) => {
    const configs = {
        running: { 
            icon: <CheckCircleIcon sx={{ fontSize: 16 }} />, 
            label: uptime ? `Running • ${formatUptime(uptime)}` : 'Running',
            sx: { 
                bgcolor: alpha('#386A20', 0.12), 
                color: '#386A20',
                '& .MuiChip-icon': { color: '#386A20' }
            }
        },
        stopped: { 
            icon: <StoppedIcon sx={{ fontSize: 16 }} />, 
            label: 'Stopped', 
            sx: { 
                bgcolor: alpha('#79747E', 0.12), 
                color: '#79747E',
                '& .MuiChip-icon': { color: '#79747E' }
            }
        },
        error: { 
            icon: <ErrorIcon sx={{ fontSize: 16 }} />, 
            label: 'Error', 
            sx: { 
                bgcolor: alpha('#B3261E', 0.12), 
                color: '#B3261E',
                '& .MuiChip-icon': { color: '#B3261E' }
            }
        },
        restarting: { 
            icon: <RestartingIcon sx={{ fontSize: 16 }} />, 
            label: 'Restarting...', 
            sx: { 
                bgcolor: alpha('#7D5700', 0.12), 
                color: '#7D5700',
                '& .MuiChip-icon': { color: '#7D5700' }
            }
        },
    };

    const config = configs[status] || configs.stopped;

    return (
        <Chip 
            icon={config.icon}
            label={config.label}
            size="small"
            sx={{ 
                ...config.sx,
                fontWeight: 500,
                height: 28,
            }}
        />
    );
};

const ProcessCard = ({ 
    process, 
    index, 
    isRunning, 
    status, 
    uptime, 
    isExpanded, 
    onToggleTerminal, 
    onStart, 
    onStop, 
    onEdit, 
    onDelete,
    dragHandleProps 
}) => {
    const statusColor = isRunning 
        ? '#386A20' 
        : status === 'error' 
            ? '#B3261E' 
            : 'transparent';

    return (
        <Card 
            sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'visible',
                transition: 'all 0.2s ease',
                '&:hover': {
                    borderColor: '#6750A4',
                    boxShadow: '0 2px 8px rgba(103, 80, 164, 0.15)',
                    transform: 'translateY(-2px)',
                },
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: 12,
                    bottom: 12,
                    width: 4,
                    borderRadius: '0 4px 4px 0',
                    bgcolor: statusColor,
                    transition: 'background-color 0.2s ease',
                }
            }}
        >
            <CardContent sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Box 
                        {...dragHandleProps}
                        sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            cursor: 'grab',
                            color: '#79747E',
                            '&:hover': { color: '#6750A4' },
                            '&:active': { cursor: 'grabbing' },
                            mt: 0.5,
                        }}
                    >
                        <DragIcon />
                    </Box>
                    
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1D1B20' }}>
                                {process.alias}
                            </Typography>
                            <StatusChip 
                                status={isRunning ? 'running' : status || 'stopped'}
                                uptime={isRunning ? uptime : null}
                            />
                            {process.autoRestart && (
                                <Chip 
                                    icon={<RefreshIcon sx={{ fontSize: 14 }} />}
                                    label="Auto-restart"
                                    size="small"
                                    variant="outlined"
                                    sx={{ 
                                        height: 24,
                                        fontSize: 11,
                                        borderColor: '#CAC4D0',
                                        color: '#625B71',
                                        '& .MuiChip-icon': { color: '#625B71' }
                                    }}
                                />
                            )}
                        </Box>
                        
                        <Box 
                            sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 0.5,
                                bgcolor: '#F3EDF7',
                                borderRadius: 2,
                                px: 1.5,
                                py: 0.75,
                                mb: 1,
                            }}
                        >
                            <Typography 
                                variant="body2" 
                                sx={{ 
                                    fontFamily: '"JetBrains Mono", monospace',
                                    fontSize: 13,
                                    color: '#6750A4',
                                    fontWeight: 500,
                                }}
                            >
                                {process.command}
                            </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <FolderIcon sx={{ fontSize: 14, color: '#79747E' }} />
                            <Typography 
                                variant="caption" 
                                sx={{ 
                                    color: '#79747E',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {process.folder}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </CardContent>
            
            <Divider sx={{ borderColor: '#E7E0EC' }} />
            
            <CardActions sx={{ px: 2, py: 1, justifyContent: 'space-between' }}>
                <Button
                    size="small"
                    startIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    onClick={onToggleTerminal}
                    sx={{ 
                        color: '#625B71',
                        '&:hover': { bgcolor: alpha('#625B71', 0.08) }
                    }}
                >
                    {isExpanded ? 'Hide' : 'Show'} Output
                </Button>
                
                <Stack direction="row" spacing={0.5}>
                    {isRunning ? (
                        <Tooltip title="Stop process">
                            <IconButton 
                                onClick={onStop}
                                sx={{ 
                                    bgcolor: alpha('#B3261E', 0.08),
                                    color: '#B3261E',
                                    '&:hover': { bgcolor: alpha('#B3261E', 0.16) }
                                }}
                            >
                                <StopIcon />
                            </IconButton>
                        </Tooltip>
                    ) : (
                        <Tooltip title="Start process">
                            <IconButton 
                                onClick={onStart}
                                sx={{ 
                                    bgcolor: alpha('#386A20', 0.08),
                                    color: '#386A20',
                                    '&:hover': { bgcolor: alpha('#386A20', 0.16) }
                                }}
                            >
                                <StartIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                    <Tooltip title={isRunning ? "Stop process before editing" : "Edit"}>
                        <span>
                            <IconButton 
                                onClick={onEdit}
                                disabled={isRunning}
                                sx={{ 
                                    color: '#625B71',
                                    '&:hover': { bgcolor: alpha('#625B71', 0.08) },
                                    '&:disabled': {
                                        color: '#CAC4D0',
                                    }
                                }}
                            >
                                <EditIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title={isRunning ? "Stop process before deleting" : "Delete"}>
                        <span>
                            <IconButton 
                                onClick={onDelete}
                                disabled={isRunning}
                                sx={{ 
                                    color: '#79747E',
                                    '&:hover': { 
                                        bgcolor: alpha('#B3261E', 0.08),
                                        color: '#B3261E'
                                    },
                                    '&:disabled': {
                                        color: '#CAC4D0',
                                    }
                                }}
                            >
                                <DeleteIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Stack>
            </CardActions>
            
            <Collapse in={isExpanded}>
                <TerminalViewer 
                    alias={process.alias} 
                    isOpen={isExpanded}
                />
            </Collapse>
        </Card>
    );
};

const App = () => {
    const [processes, setProcesses] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [aboutOpen, setAboutOpen] = useState(false);
    const [editIndex, setEditIndex] = useState(null);
    const [newProcess, setNewProcess] = useState({ 
        alias: "", 
        folder: "", 
        command: "",
        autoRestart: false 
    });
    const [runningProcesses, setRunningProcesses] = useState({});
    const [processStatus, setProcessStatus] = useState({});
    const [expandedTerminals, setExpandedTerminals] = useState({});
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const [uptimes, setUptimes] = useState({});
    
    const isWideScreen = useMediaQuery('(min-width: 1200px)');
    const isExtraWide = useMediaQuery('(min-width: 1600px)');

    useEffect(() => {
        window.electronAPI.onLoadConfig((configs) => {
            setProcesses(configs);
        });

        window.electronAPI.onLoadProcessStates((states) => {
            const running = {};
            const status = {};
            Object.entries(states).forEach(([alias, state]) => {
                const index = processes.findIndex(p => p.alias === alias);
                if (index !== -1 && state.running) {
                    running[index] = true;
                    status[alias] = 'running';
                }
            });
            setRunningProcesses(running);
            setProcessStatus(status);
        });

        window.electronAPI.onFocusProcess((alias) => {
            const index = processes.findIndex(p => p.alias === alias);
            if (index !== -1) {
                setExpandedTerminals(prev => ({ ...prev, [index]: true }));
            }
        });
    }, []);

    useEffect(() => {
        const handleProcessStopped = (alias, metadata) => {
            const index = processes.findIndex((proc) => proc.alias === alias);
            if (index !== -1) {
                const updatedRunningProcesses = { ...runningProcesses };
                delete updatedRunningProcesses[index];
                setRunningProcesses(updatedRunningProcesses);
                
                setProcessStatus(prev => ({
                    ...prev,
                    [alias]: metadata?.wasError ? 'error' : 'stopped'
                }));

                if (metadata?.wasError) {
                    setSnackbar({
                        open: true,
                        message: `${alias} crashed with exit code ${metadata.exitCode}`,
                        severity: 'error'
                    });
                }
            }
        };

        window.electronAPI.onProcessStopped(handleProcessStopped);
    }, [processes, runningProcesses]);

    useEffect(() => {
        const interval = setInterval(() => {
            Object.entries(runningProcesses).forEach(([index]) => {
                const process = processes[index];
                if (process) {
                    window.electronAPI.getProcessMetadata(process.alias).then(meta => {
                        if (meta?.startTime) {
                            setUptimes(prev => ({
                                ...prev,
                                [process.alias]: Date.now() - meta.startTime
                            }));
                        }
                    });
                }
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [runningProcesses, processes]);

    const handleDragEnd = async (result) => {
        if (!result.destination) return;
        if (result.source.index === result.destination.index) return;
        
        const items = Array.from(processes);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        
        // Update running processes indices
        const newRunning = {};
        Object.keys(runningProcesses).forEach(oldIndex => {
            const alias = processes[oldIndex]?.alias;
            const newIndex = items.findIndex(p => p.alias === alias);
            if (newIndex !== -1) {
                newRunning[newIndex] = true;
            }
        });
        
        // Update expanded terminals indices
        const newExpanded = {};
        Object.keys(expandedTerminals).forEach(oldIndex => {
            const alias = processes[oldIndex]?.alias;
            const newIndex = items.findIndex(p => p.alias === alias);
            if (newIndex !== -1 && expandedTerminals[oldIndex]) {
                newExpanded[newIndex] = true;
            }
        });
        
        // Update state
        setProcesses(items);
        setRunningProcesses(newRunning);
        setExpandedTerminals(newExpanded);
        
        // Save new order to config file
        await window.electronAPI.reorderConfigs(items);
    };

    const handleInputChange = (e) => {
        const { name, value, checked, type } = e.target;
        setNewProcess({ 
            ...newProcess, 
            [name]: type === 'checkbox' ? checked : value 
        });
    };

    const handleFolderSelection = async () => {
        const folderPath = await window.electronAPI.openFolderDialog();
        if (folderPath) {
            setNewProcess({ ...newProcess, folder: folderPath });
        }
    };

    const handleSave = () => {
        if (editIndex !== null) {
            const updatedProcesses = [...processes];
            updatedProcesses[editIndex] = newProcess;
            setProcesses(updatedProcesses);
        } else {
            setProcesses([...processes, newProcess]);
        }

        window.electronAPI.saveSettings(newProcess);
        setNewProcess({ alias: "", folder: "", command: "", autoRestart: false });
        setModalOpen(false);
        setEditIndex(null);
        
        setSnackbar({
            open: true,
            message: editIndex !== null ? 'Process updated' : 'Process added',
            severity: 'success'
        });
    };

    const handleStart = async (index) => {
        const process = processes[index];
        setProcessStatus(prev => ({ ...prev, [process.alias]: 'running' }));
        
        const result = await window.electronAPI.startProcess(process.alias, process.folder, process.command);
        if (result.success) {
            setRunningProcesses({ ...runningProcesses, [index]: true });
            setSnackbar({
                open: true,
                message: `${process.alias} started`,
                severity: 'success'
            });
        } else {
            setProcessStatus(prev => ({ ...prev, [process.alias]: 'error' }));
            setSnackbar({
                open: true,
                message: result.message,
                severity: 'error'
            });
        }
    };

    const handleStop = async (index) => {
        const process = processes[index];
        const result = await window.electronAPI.stopProcess(process.alias);
        if (result.success) {
            const updatedRunningProcesses = { ...runningProcesses };
            delete updatedRunningProcesses[index];
            setRunningProcesses(updatedRunningProcesses);
            setProcessStatus(prev => ({ ...prev, [process.alias]: 'stopped' }));
            setSnackbar({
                open: true,
                message: `${process.alias} stopped`,
                severity: 'info'
            });
        } else {
            setSnackbar({
                open: true,
                message: result.message,
                severity: 'error'
            });
        }
    };

    const handleDelete = async (index) => {
        const process = processes[index];
        const result = await window.electronAPI.deleteConfig(process.alias);
        if (result.success) {
            const updatedProcesses = [...processes];
            updatedProcesses.splice(index, 1);
            setProcesses(updatedProcesses);
            const updatedRunningProcesses = { ...runningProcesses };
            delete updatedRunningProcesses[index];
            setRunningProcesses(updatedRunningProcesses);
            setSnackbar({
                open: true,
                message: `${process.alias} deleted`,
                severity: 'info'
            });
        } else {
            setSnackbar({
                open: true,
                message: result.message,
                severity: 'error'
            });
        }
    };

    const toggleTerminal = (index) => {
        setExpandedTerminals(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const handleStartAll = async () => {
        const newRunning = { ...runningProcesses };
        const newStatus = { ...processStatus };
        
        for (let i = 0; i < processes.length; i++) {
            if (!newRunning[i]) {
                const process = processes[i];
                const result = await window.electronAPI.startProcess(process.alias, process.folder, process.command);
                if (result.success) {
                    newRunning[i] = true;
                    newStatus[process.alias] = 'running';
                }
            }
        }
        
        setRunningProcesses(newRunning);
        setProcessStatus(newStatus);
        setSnackbar({
            open: true,
            message: 'All processes started',
            severity: 'success'
        });
    };

    const handleStopAll = async () => {
        const indicesToStop = Object.keys(runningProcesses).map(Number);
        
        for (const index of indicesToStop) {
            const process = processes[index];
            if (process) {
                await window.electronAPI.stopProcess(process.alias);
            }
        }
        
        setRunningProcesses({});
        const newStatus = {};
        processes.forEach(p => { newStatus[p.alias] = 'stopped'; });
        setProcessStatus(newStatus);
        setSnackbar({
            open: true,
            message: 'All processes stopped',
            severity: 'info'
        });
    };

    const runningCount = Object.keys(runningProcesses).length;

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
                <AppBar 
                    position="sticky" 
                    sx={{ 
                        bgcolor: '#FEF7FF',
                        borderBottom: '1px solid',
                        borderColor: '#E7E0EC',
                    }}
                >
                    <Toolbar sx={{ gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                            <Box 
                                sx={{ 
                                    width: 40, 
                                    height: 40, 
                                    borderRadius: 3,
                                    bgcolor: '#EADDFF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <TerminalIcon sx={{ color: '#6750A4' }} />
                            </Box>
                            <Box>
                                <Typography variant="h6" sx={{ color: '#1D1B20', lineHeight: 1.2 }}>
                                    Servio
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#79747E' }}>
                                    {processes.length} processes • {runningCount} running
                                </Typography>
                            </Box>
                        </Box>
                        
                        <Button 
                            variant="contained"
                            onClick={handleStartAll}
                            startIcon={<StartAllIcon />}
                            disabled={runningCount === processes.length || processes.length === 0}
                            sx={{ 
                                bgcolor: '#386A20',
                                color: '#FFFFFF',
                                px: 2.5,
                                py: 1,
                                borderRadius: 3,
                                fontWeight: 600,
                                boxShadow: '0 2px 8px rgba(56, 106, 32, 0.3)',
                                '&:hover': { 
                                    bgcolor: '#2D5A18',
                                    boxShadow: '0 4px 12px rgba(56, 106, 32, 0.4)',
                                },
                                '&:disabled': {
                                    bgcolor: '#E7E0EC',
                                    color: '#79747E',
                                    boxShadow: 'none',
                                },
                                transition: 'all 0.2s ease',
                            }}
                        >
                            Start All
                        </Button>
                        <Button 
                            variant="contained"
                            onClick={handleStopAll}
                            startIcon={<StopAllIcon />}
                            disabled={runningCount === 0}
                            sx={{ 
                                bgcolor: '#B3261E',
                                color: '#FFFFFF',
                                px: 2.5,
                                py: 1,
                                borderRadius: 3,
                                fontWeight: 600,
                                boxShadow: '0 2px 8px rgba(179, 38, 30, 0.3)',
                                '&:hover': { 
                                    bgcolor: '#8C1D18',
                                    boxShadow: '0 4px 12px rgba(179, 38, 30, 0.4)',
                                },
                                '&:disabled': {
                                    bgcolor: '#E7E0EC',
                                    color: '#79747E',
                                    boxShadow: 'none',
                                },
                                transition: 'all 0.2s ease',
                            }}
                        >
                            Stop All
                        </Button>
                        <Tooltip title="About Servio">
                            <IconButton 
                                onClick={() => setAboutOpen(true)}
                                sx={{ 
                                    color: '#6750A4',
                                    ml: 1,
                                    '&:hover': { bgcolor: alpha('#6750A4', 0.08) }
                                }}
                            >
                                <InfoIcon />
                            </IconButton>
                        </Tooltip>
                    </Toolbar>
                </AppBar>
                
                <Container 
                    maxWidth={isExtraWide ? 'xl' : isWideScreen ? 'lg' : 'md'} 
                    sx={{ py: 3, pb: 12 }}
                >
                    {processes.length === 0 ? (
                        <Card sx={{ textAlign: 'center', py: 6, bgcolor: '#FEF7FF' }}>
                            <Box 
                                sx={{ 
                                    width: 80, 
                                    height: 80, 
                                    borderRadius: 4,
                                    bgcolor: '#EADDFF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mx: 'auto',
                                    mb: 3,
                                }}
                            >
                                <TerminalIcon sx={{ fontSize: 40, color: '#6750A4' }} />
                            </Box>
                            <Typography variant="h6" sx={{ color: '#1D1B20', mb: 1 }}>
                                No processes configured
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#79747E', mb: 3 }}>
                                Add your first process to get started
                            </Typography>
                            <Button 
                                variant="contained" 
                                startIcon={<AddIcon />}
                                onClick={() => {
                                    setEditIndex(null);
                                    setNewProcess({ alias: "", folder: "", command: "", autoRestart: false });
                                    setModalOpen(true);
                                }}
                                sx={{ bgcolor: '#6750A4' }}
                            >
                                Add Process
                            </Button>
                        </Card>
                    ) : (
                        <DragDropContext onDragEnd={handleDragEnd}>
                            <Droppable droppableId="processes">
                                {(provided, snapshot) => (
                                    <Grid
                                        container
                                        spacing={2}
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        sx={{
                                            minHeight: 100,
                                            transition: 'background-color 0.2s ease',
                                            borderRadius: 3,
                                            p: snapshot.isDraggingOver ? 1 : 0,
                                            bgcolor: snapshot.isDraggingOver ? alpha('#6750A4', 0.04) : 'transparent',
                                        }}
                                    >
                                        {processes.map((process, index) => (
                                            <Draggable 
                                                key={process.alias} 
                                                draggableId={process.alias} 
                                                index={index}
                                            >
                                                {(provided, snapshot) => (
                                                    <Grid
                                                        item
                                                        xs={12}
                                                        lg={isExtraWide ? 4 : isWideScreen ? 6 : 12}
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        sx={{
                                                            ...provided.draggableProps.style,
                                                            opacity: snapshot.isDragging ? 0.9 : 1,
                                                        }}
                                                    >
                                                        <ProcessCard
                                                            process={process}
                                                            index={index}
                                                            isRunning={!!runningProcesses[index]}
                                                            status={processStatus[process.alias]}
                                                            uptime={uptimes[process.alias]}
                                                            isExpanded={!!expandedTerminals[index]}
                                                            onToggleTerminal={() => toggleTerminal(index)}
                                                            onStart={() => handleStart(index)}
                                                            onStop={() => handleStop(index)}
                                                            onEdit={() => {
                                                                setEditIndex(index);
                                                                setNewProcess(process);
                                                                setModalOpen(true);
                                                            }}
                                                            onDelete={() => handleDelete(index)}
                                                            dragHandleProps={provided.dragHandleProps}
                                                        />
                                                    </Grid>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </Grid>
                                )}
                            </Droppable>
                        </DragDropContext>
                    )}
                </Container>
                
                <Fab
                    color="primary"
                    aria-label="add"
                    sx={{ 
                        position: "fixed", 
                        bottom: 24, 
                        right: 24,
                        bgcolor: '#6750A4',
                        '&:hover': { bgcolor: '#7965AF' },
                        width: 56,
                        height: 56,
                    }}
                    onClick={() => {
                        setEditIndex(null);
                        setNewProcess({ alias: "", folder: "", command: "", autoRestart: false });
                        setModalOpen(true);
                    }}
                >
                    <AddIcon />
                </Fab>
            </Box>
            
            <Dialog 
                open={modalOpen} 
                onClose={() => setModalOpen(false)} 
                maxWidth="sm" 
                fullWidth
                PaperProps={{
                    sx: { bgcolor: '#FEF7FF' }
                }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography variant="h6" sx={{ color: '#1D1B20' }}>
                        {editIndex !== null ? "Edit Process" : "Add New Process"}
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <TextField
                        label="Name"
                        name="alias"
                        value={newProcess.alias}
                        onChange={handleInputChange}
                        fullWidth
                        margin="dense"
                        placeholder="e.g., Frontend Dev Server"
                        helperText="A friendly name for this process"
                        sx={{ mt: 1 }}
                    />
                    <TextField
                        label="Command"
                        name="command"
                        value={newProcess.command}
                        onChange={handleInputChange}
                        fullWidth
                        margin="dense"
                        placeholder="e.g., npm run dev"
                        helperText="The command to execute"
                        sx={{ mt: 2 }}
                        InputProps={{
                            sx: { fontFamily: '"JetBrains Mono", monospace' }
                        }}
                    />
                    <Button 
                        variant="outlined" 
                        onClick={handleFolderSelection} 
                        fullWidth 
                        startIcon={<FolderIcon />}
                        sx={{ 
                            mt: 3,
                            borderColor: '#CAC4D0',
                            color: '#6750A4',
                            '&:hover': { 
                                borderColor: '#6750A4',
                                bgcolor: alpha('#6750A4', 0.04)
                            }
                        }}
                    >
                        Select Working Directory
                    </Button>
                    {newProcess.folder && (
                        <Box 
                            sx={{ 
                                mt: 1.5, 
                                p: 1.5, 
                                bgcolor: '#F3EDF7', 
                                borderRadius: 2,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                            }}
                        >
                            <FolderIcon sx={{ fontSize: 18, color: '#6750A4' }} />
                            <Typography 
                                variant="body2"
                                sx={{ 
                                    fontFamily: '"JetBrains Mono", monospace',
                                    fontSize: 12,
                                    color: '#49454F',
                                }}
                            >
                                {newProcess.folder}
                            </Typography>
                        </Box>
                    )}
                    <FormControlLabel
                        control={
                            <Checkbox
                                name="autoRestart"
                                checked={newProcess.autoRestart || false}
                                onChange={handleInputChange}
                                sx={{
                                    color: '#79747E',
                                    '&.Mui-checked': { color: '#6750A4' }
                                }}
                            />
                        }
                        label={
                            <Box>
                                <Typography variant="body2" sx={{ color: '#1D1B20' }}>
                                    Auto-restart on crash
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#79747E' }}>
                                    Automatically restart if the process exits with an error (max 5 attempts)
                                </Typography>
                            </Box>
                        }
                        sx={{ mt: 2, alignItems: 'flex-start' }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button 
                        onClick={() => setModalOpen(false)} 
                        sx={{ color: '#6750A4' }}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        variant="contained"
                        disabled={!newProcess.alias || !newProcess.command || !newProcess.folder}
                        sx={{ 
                            bgcolor: '#6750A4',
                            '&:hover': { bgcolor: '#7965AF' },
                            '&:disabled': { bgcolor: '#E7E0EC', color: '#1D1B20' }
                        }}
                    >
                        {editIndex !== null ? 'Update' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* About Dialog */}
            <Dialog 
                open={aboutOpen} 
                onClose={() => setAboutOpen(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: { 
                        bgcolor: '#FEF7FF',
                        borderRadius: 6,
                        overflow: 'hidden',
                    }
                }}
            >
                <Box 
                    sx={{ 
                        bgcolor: '#EADDFF', 
                        py: 4, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center',
                        position: 'relative',
                    }}
                >
                    <Box 
                        sx={{ 
                            width: 80, 
                            height: 80, 
                            borderRadius: 4,
                            bgcolor: '#6750A4',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 2,
                            boxShadow: '0 4px 20px rgba(103, 80, 164, 0.3)',
                        }}
                    >
                        <TerminalIcon sx={{ fontSize: 40, color: '#FFFFFF' }} />
                    </Box>
                    <Typography variant="h5" sx={{ color: '#1D1B20', fontWeight: 600 }}>
                        Servio
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6750A4', fontWeight: 500 }}>
                        Version 1.0.0
                    </Typography>
                </Box>
                <DialogContent sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="body2" sx={{ color: '#49454F', mb: 3 }}>
                        A desktop app for managing and monitoring server processes with auto-restart and notifications.
                    </Typography>
                    
                    <Box sx={{ 
                        bgcolor: '#F3EDF7', 
                        borderRadius: 3, 
                        p: 2, 
                        mb: 2,
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            <Typography variant="body2" sx={{ color: '#79747E' }}>
                                Created with
                            </Typography>
                            <FavoriteIcon sx={{ fontSize: 16, color: '#B3261E' }} />
                            <Typography variant="body2" sx={{ color: '#79747E' }}>
                                by
                            </Typography>
                        </Box>
                        <Typography variant="h6" sx={{ color: '#6750A4', fontWeight: 600, mt: 0.5 }}>
                            Abhishek Verma
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Chip 
                            label="Electron" 
                            size="small" 
                            sx={{ bgcolor: '#E7E0EC', color: '#49454F' }}
                        />
                        <Chip 
                            label="React" 
                            size="small" 
                            sx={{ bgcolor: '#E7E0EC', color: '#49454F' }}
                        />
                        <Chip 
                            label="Material UI" 
                            size="small" 
                            sx={{ bgcolor: '#E7E0EC', color: '#49454F' }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
                    <Button 
                        onClick={() => setAboutOpen(false)}
                        variant="contained"
                        sx={{ 
                            bgcolor: '#6750A4',
                            '&:hover': { bgcolor: '#7965AF' },
                            px: 4,
                        }}
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert 
                    onClose={() => setSnackbar({ ...snackbar, open: false })} 
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ 
                        borderRadius: 3,
                        ...(snackbar.severity === 'success' && { bgcolor: '#386A20' }),
                        ...(snackbar.severity === 'error' && { bgcolor: '#B3261E' }),
                        ...(snackbar.severity === 'info' && { bgcolor: '#6750A4' }),
                    }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </ThemeProvider>
    );
};

ReactDOM.render(<App />, document.getElementById("root"));
