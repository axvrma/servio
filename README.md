# Servio

A desktop application for managing and monitoring server processes with auto-restart and notifications.

## Features

- **Process Management**: Easily start, stop, and manage multiple server processes.
- **Monitoring & Auto-Restart**: Keep track of your processes and ensure they automatically restart on failure.
- **Notifications**: Get real-time alerts about process state changes.
- **Modern User Interface**: Built with React and Material UI (MUI) for a clean, intuitive experience.
- **Cross-Platform**: Powered by Electron to run seamlessly on your desktop.

## Tech Stack

- [Electron](https://www.electronjs.org/)
- [React](https://react.dev/)
- [Material UI (MUI)](https://mui.com/)
- Webpack & Babel
- Electron Forge

## Project Structure

- `src/main/` - Electron main process code (`main.js`, `preload.js`).
- `src/renderer/` - React frontend code for the application's user interface.
- `src/terminal/` - Terminal-related functionality (if applicable).
- `assets/` - Static assets and icons used within the app.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Ensure you have a recent version installed)
- npm (Comes with Node.js)

### Installation

Clone the repository and install the dependencies:

```bash
# Install dependencies
npm install
```

### Running Locally

To start the application in development mode:

```bash
npm start
```

### Building and Packaging

To package the application for your operating system:

```bash
npm run package
```

To make distribution bundles (e.g., `.dmg`, `.zip`, `.deb`, `.rpm`, `.exe` based on your OS):

```bash
npm run make
```

You can also run `npm run build` which will sequentially run both `make` and `package`.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
