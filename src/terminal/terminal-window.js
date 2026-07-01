(function () {
    const MAX_TERMINAL_LINES = 1000;
    const params = new URLSearchParams(window.location.search);
    const alias = params.get("alias") || "";
    const output = [];
    let autoScroll = true;

    const aliasElement = document.getElementById("alias");
    const metaElement = document.getElementById("meta");
    const terminalElement = document.getElementById("terminal");
    const autoScrollElement = document.getElementById("autoScroll");
    const clearElement = document.getElementById("clear");

    const setTitle = () => {
        const title = alias ? `${alias} Output` : "Output";
        aliasElement.textContent = title;
        document.title = `${title} - Servio`;
    };

    const updateMeta = () => {
        metaElement.textContent = `${output.length} ${output.length === 1 ? "line" : "lines"}`;
    };

    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            terminalElement.scrollTop = terminalElement.scrollHeight;
        });
    };

    const createLineElement = (line) => {
        const row = document.createElement("div");
        row.className = `line${line.isError ? " error" : ""}`;

        const timestamp = document.createElement("span");
        timestamp.className = "timestamp";
        timestamp.textContent = line.timestamp || "";

        const text = document.createElement("span");
        text.className = "text";
        text.textContent = line.text || " ";

        row.append(timestamp, text);
        return row;
    };

    const render = () => {
        terminalElement.replaceChildren();

        if (output.length === 0) {
            const empty = document.createElement("div");
            empty.className = "empty";
            empty.textContent = "No output yet. Start the process to see logs here.";
            terminalElement.appendChild(empty);
        } else {
            output.forEach((line) => {
                terminalElement.appendChild(createLineElement(line));
            });
        }

        updateMeta();

        if (autoScroll) {
            scrollToBottom();
        }
    };

    const appendLine = (line) => {
        output.push(line);
        if (output.length > MAX_TERMINAL_LINES) {
            output.splice(0, output.length - MAX_TERMINAL_LINES);
        }
        render();
    };

    const loadOutput = async () => {
        if (!alias) {
            render();
            return;
        }

        const lines = await window.electronAPI.getProcessOutput(alias);
        output.splice(0, output.length, ...lines.slice(-MAX_TERMINAL_LINES));
        render();
    };

    setTitle();
    loadOutput();

    autoScrollElement.addEventListener("change", (event) => {
        autoScroll = event.target.checked;
        if (autoScroll) {
            scrollToBottom();
        }
    });

    clearElement.addEventListener("click", async () => {
        if (!alias) return;
        await window.electronAPI.clearProcessOutput(alias);
    });

    const unsubscribeOutput = window.electronAPI.onProcessOutput((outputAlias, line) => {
        if (outputAlias === alias) {
            appendLine(line);
        }
    });

    const unsubscribeCleared = window.electronAPI.onProcessOutputCleared((outputAlias) => {
        if (outputAlias === alias) {
            output.splice(0, output.length);
            render();
        }
    });

    window.addEventListener("beforeunload", () => {
        unsubscribeOutput();
        unsubscribeCleared();
    });
}());
