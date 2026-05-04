document.addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("board-root");
    if (!root) return;

    const chatMessages = document.getElementById("chat-messages");
    const chatInput = document.getElementById("chat-input");
    const chatSendBtn = document.getElementById("chat-send-btn");
    const clearBtn = document.getElementById("clear-tokens-btn");
    const deleteTokenBtn = document.getElementById("delete-token-btn");
    const addTokenBtn = document.getElementById("add-token-btn");
    const addTokenModal = document.getElementById("add-token-modal");
    const closeAddToken = document.getElementById("close-add-token");

    const boardId = root.dataset.boardId;
    const role = root.dataset.role;
    const currentUserId = parseInt(root.dataset.userId);
    const backgroundUrl = root.dataset.background;
    const uploadMapUrl = root.dataset.uploadMapUrl;
    const staticBase = root.dataset.staticBase;
    const csrf = root.dataset.csrf;

    const wsProtocol = window.location.hostname === 'localhost' ? 'ws' : 'wss';
    const ws = new WebSocket(`${wsProtocol}://${window.location.host}/ws/board/${boardId}/`);

    const CANVAS_WIDTH = 1200;
    const CANVAS_HEIGHT = 800;

    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    canvas.style.border = "1px solid #444";
    root.appendChild(canvas);

    const ctx = canvas.getContext("2d");

    let backgroundImage = null;
    let tokens = [];
    let chatLog = [];

    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    let draggingToken = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    let panning = false;
    let panStartX = 0;
    let panStartY = 0;

    let selectedType = null;
    let selectedCharacterId = null;
    let selectedStaticPath = null;
    let selectedUploadFile = null;

    const imageCache = {};

    function getCSRFToken() {
        const cookieValue = document.cookie
            .split("; ")
            .find(row => row.startsWith("csrftoken="));
        return cookieValue ? cookieValue.split("=")[1] : "";
    }

    function drawTokens() {
        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);

        tokens.forEach(token => {
            if (!token) return;

            const baseSize = token.size || 60;
            const size = baseSize / scale;
            const radius = size / 2;

            if (token.image) {
                if (!imageCache[token.image]) {
                    const img = new Image();
                    img.src = token.image;
                    imageCache[token.image] = img;

                    img.onload = () => drawBoard();
                    img.onerror = () => console.warn("No se pudo cargar la imagen:", token.image);
                }

                const img = imageCache[token.image];

                if (img.complete && img.naturalWidth > 0) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(token.x, token.y, radius, 0, Math.PI * 2);
                    ctx.clip();
                    ctx.drawImage(img, token.x - radius, token.y - radius, size, size);
                    ctx.restore();
                }
            } else {
                ctx.beginPath();
                ctx.arc(token.x, token.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = token.color || "#ff0000";
                ctx.fill();
            }

            if (token.label) {
                ctx.fillStyle = "white";
                ctx.font = `${12 / scale}px Arial`;
                ctx.fillText(token.label, token.x - radius, token.y - radius - 5);
            }
        });

        ctx.restore();
    }

    function drawBoard() {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        if (backgroundImage) {
            ctx.save();
            ctx.translate(offsetX, offsetY);
            ctx.scale(scale, scale);
            ctx.drawImage(backgroundImage, 0, 0);
            ctx.restore();
        }

        drawTokens();
    }

    function openTokenMenu(x, y, token) {
        const menu = document.getElementById("token-menu");
        if (!menu) return;

        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.classList.remove("hidden");
        menu.dataset.tokenId = token.id;
    }

    function renderChat() {
        if (!chatMessages) return;

        chatMessages.innerHTML = "";

        chatLog.forEach(msg => {
            const div = document.createElement("div");
            div.style.marginBottom = "6px";

            const meta = document.createElement("div");
            meta.style.fontSize = "11px";
            meta.style.color = "#aaa";
            meta.textContent = `[${msg.time}] ${msg.author}`;

            const text = document.createElement("div");
            text.textContent = msg.text;

            div.appendChild(meta);
            div.appendChild(text);

            chatMessages.appendChild(div);
        });

        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addChatMessage(text, author = username) {
        if (!text.trim()) return;

        const now = new Date();
        const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        ws.send(JSON.stringify({
            type: "chat",
            text: text.trim(),
            author,
            time,
        }));
    }

    function initBackground() {
        if (!backgroundUrl) return;

        backgroundImage = new Image();
        backgroundImage.src = backgroundUrl;
        backgroundImage.onload = () => {
            const scaleX = CANVAS_WIDTH / backgroundImage.width;
            const scaleY = CANVAS_HEIGHT / backgroundImage.height;
            scale = Math.min(scaleX, scaleY);
            drawBoard();
        };
    }

    function loadTokens() {
        fetch(`/boards/${boardId}/tokens/`)
            .then(response => response.json())
            .then(data => {
                tokens = data.tokens;
                drawBoard();
            });
    }

    function setupCanvas() {
        canvas.addEventListener("wheel", (e) => {
            e.preventDefault();

            const zoomFactor = 1.1;
            const mouseX = e.offsetX;
            const mouseY = e.offsetY;

            const direction = e.deltaY < 0 ? 1 : -1;
            const newScale = direction > 0 ? scale * zoomFactor : scale / zoomFactor;

            offsetX = mouseX - (mouseX - offsetX) * (newScale / scale);
            offsetY = mouseY - (mouseY - offsetY) * (newScale / scale);

            scale = newScale;
            drawBoard();
        });

        canvas.addEventListener("mousedown", (e) => {
            if (e.button === 1 || e.button === 2) {
                panning = true;
                panStartX = e.clientX - offsetX;
                panStartY = e.clientY - offsetY;
            }

            const rect = canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left - offsetX) / scale;
            const mouseY = (e.clientY - rect.top - offsetY) / scale;

            const token = tokens.find(t => Math.hypot(t.x - mouseX, t.y - mouseY) <= 15 / scale);
            if (!token) return;

            const isDM = role === "DM";
            const isOwner = token.owner_id === currentUserId;

            if (!isDM && !isOwner) return;

            draggingToken = token;
            dragOffsetX = mouseX - token.x;
            dragOffsetY = mouseY - token.y;
        });


        canvas.addEventListener("mousemove", (e) => {
            if (panning) {
                offsetX = e.clientX - panStartX;
                offsetY = e.clientY - panStartY;
                drawBoard();
                return;
            }

            if (draggingToken) {
                const rect = canvas.getBoundingClientRect();
                draggingToken.x = (e.clientX - rect.left - offsetX) / scale - dragOffsetX;
                draggingToken.y = (e.clientY - rect.top - offsetY) / scale - dragOffsetY;
                drawBoard();
            }
        });

        canvas.addEventListener("mouseup", () => {
            if (draggingToken) {
                fetch(`/tokens/${draggingToken.id}/move/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": getCSRFToken(),
                    },
                    body: JSON.stringify({
                        x: draggingToken.x,
                        y: draggingToken.y,
                    }),
                });

                ws.send(JSON.stringify({
                    type: "token_move",
                    token_id: draggingToken.id,
                    x: draggingToken.x,
                    y: draggingToken.y,
                }));
            }

            draggingToken = null;
            panning = false;
        });

        canvas.addEventListener("contextmenu", (e) => {
            e.preventDefault();

            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left - offsetX) / scale;
            const y = (e.clientY - rect.top - offsetY) / scale;

            const token = tokens.find(t => {
                const baseSize = t.size || 60;
                const size = baseSize / scale;
                const radius = size / 2;
                return Math.hypot(t.x - x, t.y - y) <= radius;
            });

            if (token) {
                openTokenMenu(e.clientX, e.clientY, token);
            }
        });

        document.addEventListener("click", () => {
            const menu = document.getElementById("token-menu");
            if (menu) {
                menu.classList.add("hidden");
            }
        });

        if (deleteTokenBtn) {
            deleteTokenBtn.addEventListener("click", () => {
                const menu = document.getElementById("token-menu");
                const tokenId = parseInt(menu.dataset.tokenId);

                fetch(`/token/${tokenId}/delete/`, {
                    method: "POST",
                    headers: { "X-CSRFToken": getCSRFToken() }
                });

                ws.send(JSON.stringify({
                    type: "token_delete",
                    token_id: tokenId
                }));

                menu.classList.add("hidden");
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener("click", () => {
                fetch(`/boards/${boardId}/clear_tokens/`, {
                    method: "POST",
                    headers: { "X-CSRFToken": getCSRFToken() }
                })
                .then(response => response.json())
                .then(() => {
                    tokens = [];
                    drawBoard();

                    ws.send(JSON.stringify({
                        type: "token_clear"
                    }));
                })
                .catch(err => console.error("Error en clear_tokens:", err));
            });
        }
    }

    function setupChat() {
        if (!chatSendBtn || !chatInput) return;

        chatSendBtn.addEventListener("click", () => {
            addChatMessage(chatInput.value);
            chatInput.value = "";
            chatInput.focus();
        });

        chatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                addChatMessage(chatInput.value);
                chatInput.value = "";
            }
        });
    }

    function setupWebSocket() {
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === "chat_message") {
                chatLog.push(data);
                renderChat();
                return;
            }

            if (data.type === "token_move") {
                const token = tokens.find(t => t.id === data.token_id);
                if (token) {
                    token.x = data.x;
                    token.y = data.y;
                    drawBoard();
                }
                return;
            }

            if (data.type === "map_change") {
                backgroundImage = new Image();
                backgroundImage.src = data.background_url;

                backgroundImage.onload = () => {
                    offsetX = 0;
                    offsetY = 0;
                    scale = 1;

                    const scaleX = CANVAS_WIDTH / backgroundImage.width;
                    const scaleY = CANVAS_HEIGHT / backgroundImage.height;
                    scale = Math.min(scaleX, scaleY);

                    drawBoard();
                };
                return;
            }

            if (data.type === "token_add") {
                if (!data.token) return;

                if (!tokens.find(t => t.id === data.token.id)) {
                    tokens.push(data.token);
                }

                drawBoard();
                return;
            }

            if (data.type === "token_clear") {
                tokens = [];
                drawBoard();
                return;
            }

            if (data.type === "token_delete") {
                const index = tokens.findIndex(t => t.id === data.token_id);
                if (index !== -1) {
                    tokens.splice(index, 1);
                    drawBoard();
                }
                return;
            }

            if (data.type === "dice_roll") {
                const msg = `${data.author}: ${data.notation} => ${data.results.join(" + ")} = ${data.total}`;

                chatLog.push({
                    author: data.author,
                    text: msg,
                    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                });

                renderChat();
                return;
            }
        };
    }

    function setupDiceModal() {
        const diceModal = document.getElementById("dice-modal");
        const openDiceBtn = document.getElementById("open-dice-btn");
        const closeDiceBtn = document.getElementById("dice-close");

        if (!diceModal) return;

        if (openDiceBtn) {
            openDiceBtn.addEventListener("click", () => {
                diceModal.classList.remove("hidden");
            });
        }

        if (closeDiceBtn) {
            closeDiceBtn.addEventListener("click", () => {
                diceModal.classList.add("hidden");
            });
        }

        diceModal.addEventListener("click", (e) => {
            if (e.target === diceModal) {
                diceModal.classList.add("hidden");
            }
        });

        document.querySelectorAll(".dice-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const sides = parseInt(btn.dataset.sides);
                const countInput = document.querySelector(`.dice-count[data-sides="${sides}"]`);
                const bonusInput = document.querySelector(`.dice-bonus[data-sides="${sides}"]`);

                const count = parseInt(countInput.value);
                const bonus = parseInt(bonusInput.value) || 0;

                fetch(`/boards/${boardId}/roll_dice/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": getCSRFToken(),
                    },
                    body: JSON.stringify({ sides, count, bonus })
                }).catch(err => console.error("Error enviando tirada:", err));

                diceModal.classList.add("hidden");
            });
        });
    }

    function setupTokenModal() {
        if (addTokenBtn) {
            addTokenBtn.addEventListener("click", () => {
                addTokenModal.classList.remove("hidden");
            });
        }

        if (closeAddToken) {
            closeAddToken.addEventListener("click", () => {
                addTokenModal.classList.add("hidden");
            });
        }

        const tokenChoices = document.querySelectorAll(".token-choice");

        tokenChoices.forEach(choice => {
            choice.addEventListener("click", () => {
                tokenChoices.forEach(c => c.style.outline = "none");
                choice.style.outline = "3px solid #4caf50";

                selectedType = choice.dataset.type;

                if (selectedType === "character") {
                    selectedCharacterId = choice.dataset.id;
                    selectedStaticPath = null;
                    selectedUploadFile = null;
                }

                if (selectedType === "static") {
                    selectedStaticPath = choice.dataset.path;
                    selectedCharacterId = null;
                    selectedUploadFile = null;
                }
            });
        });

        const uploadTokenInput = document.getElementById("token-upload");

        if (uploadTokenInput) {
            uploadTokenInput.addEventListener("change", () => {
                if (uploadTokenInput.files.length > 0) {
                    selectedType = "upload";
                    selectedUploadFile = uploadTokenInput.files[0];
                    selectedCharacterId = null;
                    selectedStaticPath = null;

                    tokenChoices.forEach(c => c.style.outline = "none");
                }
            });
        }

        const createTokenBtn = document.getElementById("create-token-btn");

        if (createTokenBtn) {
            createTokenBtn.addEventListener("click", () => {
                if (!selectedType) {
                    alert("Selecciona un tipo de token.");
                    return;
                }

                const manualName = document.getElementById("manual-token-name").value.trim();
                const size = parseInt(document.getElementById("token-size").value);

                const formData = new FormData();
                formData.append("type", selectedType);
                formData.append("x", 200);
                formData.append("y", 200);
                formData.append("label", manualName);
                formData.append("size", `${size}`);

                if (selectedType === "character") {
                    formData.append("character_id", selectedCharacterId);
                }

                if (selectedType === "static") {
                    formData.append("static_path", selectedStaticPath);
                }

                if (selectedType === "upload") {
                    formData.append("upload", selectedUploadFile);
                }

                fetch(`/boards/${boardId}/add_token/`, {
                    method: "POST",
                    headers: { "X-CSRFToken": getCSRFToken() },
                    body: formData
                })
                .then(r => r.json())
                .then(data => {
                    if (!data.token) return;

                    tokens.push(data.token);
                    drawBoard();

                    ws.send(JSON.stringify({
                        type: "token_add",
                        token: data.token
                    }));

                    addTokenModal.classList.add("hidden");
                });
            });
        }
    }

    function setupMapModal() {
        const mapModal = document.getElementById("add-map-modal");
        const openMapBtn = document.getElementById("add-map-btn");
        const closeMapBtn = document.getElementById("close-add-map");
        const applyMapBtn = document.getElementById("apply-map-btn");
        const mapUploadInput = document.getElementById("map-upload");

        if (!mapModal || !applyMapBtn) return;

        let selectedMap = null;
        let uploadedMap = null;

        if (openMapBtn) {
            openMapBtn.addEventListener("click", () => {
                mapModal.classList.remove("hidden");
            });
        }

        if (closeMapBtn) {
            closeMapBtn.addEventListener("click", () => {
                mapModal.classList.add("hidden");
            });
        }

        document.querySelectorAll("#add-map-modal .map-choice").forEach(choice => {
            choice.addEventListener("click", () => {
                document.querySelectorAll("#add-map-modal .map-choice")
                    .forEach(c => c.classList.remove("selected"));

                choice.classList.add("selected");

                selectedMap = choice.dataset.map;
                uploadedMap = null;

                if (mapUploadInput) {
                    mapUploadInput.value = "";
                }
            });
        });

        if (mapUploadInput) {
            mapUploadInput.addEventListener("change", () => {
                selectedMap = null;
                uploadedMap = mapUploadInput.files[0] || null;

                document.querySelectorAll("#add-map-modal .map-choice")
                    .forEach(c => c.classList.remove("selected"));
            });
        }

        applyMapBtn.addEventListener("click", () => {
            if (uploadedMap) {
                const formData = new FormData();
                formData.append("map", uploadedMap);

                fetch(uploadMapUrl, {
                    method: "POST",
                    headers: { "X-CSRFToken": csrf },
                    body: formData
                })
                .then(r => r.json())
                .then(data => {
                    const url = data.url;

                    backgroundImage = new Image();
                    backgroundImage.onload = () => drawBoard();
                    backgroundImage.src = url;

                    root.dataset.background = url;

                    mapModal.classList.add("hidden");
                    uploadedMap = null;
                    mapUploadInput.value = "";
                });

                return;
            }

            if (selectedMap) {
                const mapName = selectedMap;
                const url = staticBase + "assets/maps/" + mapName;

                fetch(`/boards/${boardId}/set_map/`, {
                    method: "POST",
                    headers: {
                        "X-CSRFToken": getCSRFToken(),
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: `map=${encodeURIComponent(mapName)}`
                });

                ws.send(JSON.stringify({
                    type: "map_change",
                    background_url: url
                }));

                backgroundImage = new Image();
                backgroundImage.src = url;
                backgroundImage.onload = () => {
                    offsetX = 0;
                    offsetY = 0;
                    scale = 1;

                    const scaleX = CANVAS_WIDTH / backgroundImage.width;
                    const scaleY = CANVAS_HEIGHT / backgroundImage.height;
                    scale = Math.min(scaleX, scaleY);

                    drawBoard();
                };

                root.dataset.background = url;
                mapModal.classList.add("hidden");
            }
        });
    }

    function setupNotesModal() {
        const notesBtn = document.getElementById("open-notes-btn");
        const notesModal = document.getElementById("notes-modal");
        const closeNotesBtn = document.getElementById("close-notes-btn");
        const notesTextarea = document.getElementById("notes-content");
        const saveStatus = document.getElementById("notes-save-status");

        if (!notesBtn || !notesModal || !notesTextarea) return;

        let saveTimeout = null;
        let originalContent = "";

        function saveNotes(content) {
            fetch(`/boards/${boardId}/notes/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCSRFToken(),
                },
                body: JSON.stringify({ content: content })
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === "ok") {
                    saveStatus.textContent = "Guardado";
                    originalContent = content;
                } else {
                    saveStatus.textContent = "Error al guardar";
                }
            })
            .catch(err => {
                console.error("Error guardando notas:", err);
                saveStatus.textContent = "Error de conexión";
            });
        }

        function loadNotes() {
            fetch(`/boards/${boardId}/notes/`)
                .then(response => response.json())
                .then(data => {
                    notesTextarea.value = data.content || "";
                    originalContent = data.content || "";
                    saveStatus.textContent = "Guardado";
                })
                .catch(err => {
                    console.error("Error cargando notas:", err);
                    notesTextarea.value = "";
                    saveStatus.textContent = "Error al cargar";
                });
        }

        notesBtn.addEventListener("click", () => {
            loadNotes();
            notesModal.classList.remove("hidden");
            notesTextarea.focus();
        });

        function closeModal() {
            if (notesTextarea.value !== originalContent) {
                saveNotes(notesTextarea.value);
            }
            notesModal.classList.add("hidden");
        }

        closeNotesBtn.addEventListener("click", closeModal);

        notesModal.addEventListener("click", (e) => {
            if (e.target === notesModal) {
                closeModal();
            }
        });

        notesTextarea.addEventListener("input", () => {
            const currentContent = notesTextarea.value;
            if (currentContent === originalContent) {
                saveStatus.textContent = "Guardado";
                return;
            }

            saveStatus.textContent = "Guardando...";

            if (saveTimeout) clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                saveNotes(currentContent);
            }, 1000);
        });

        window.addEventListener("beforeunload", () => {
            if (notesTextarea.value !== originalContent) {
                saveNotes(notesTextarea.value);
            }
        });
    }

    function setupCharacterSheetModal() {
        const openBtn = document.getElementById("open-character-sheet-btn");
        const modal = document.getElementById("character-sheet-modal");
        const closeBtn = document.getElementById("close-character-sheet-btn");

        if (!openBtn || !modal || !closeBtn) return;

        openBtn.addEventListener("click", () => {
            modal.classList.remove("hidden");
        });

        closeBtn.addEventListener("click", () => {
            modal.classList.add("hidden");
        });

        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                modal.classList.add("hidden");
            }
        });
    }

    initBackground();
    loadTokens();
    setupCanvas();
    setupChat();
    setupWebSocket();
    setupDiceModal();
    setupTokenModal();
    setupMapModal();
    setupNotesModal();
    setupCharacterSheetModal();
});