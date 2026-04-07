const root = document.getElementById("board-root");
if (!root) {
    console.error("No se encontró #board-root");
}

const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const chatSendBtn = document.getElementById("chat-send-btn");

const addBtn = document.getElementById("add-token-btn");
const clearBtn = document.getElementById("clear-tokens-btn");
const mapSelector = document.getElementById("map-selector");

const boardId = root.dataset.boardId;
const role = root.dataset.role;
const backgroundUrl = root.dataset.background;

const ws = new WebSocket(`ws://${window.location.host}/ws/board/${boardId}/`);

let chatLog = [];

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

let scale = 1;
let offsetX = 0;
let offsetY = 0;

let draggingToken = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

let panning = false;
let panStartX = 0;
let panStartY = 0;

function getCSRFToken() {
    const cookieValue = document.cookie
        .split("; ")
        .find(row => row.startsWith("csrftoken="));
    return cookieValue ? cookieValue.split("=")[1] : "";
}

if (addBtn) {
    addBtn.addEventListener("click", () => {
        fetch(`/boards/${boardId}/add_token/`, {
            method: "POST",
            headers: { "X-CSRFToken": getCSRFToken() }
        })
        .then(response => response.json())
        .then(data => {
            tokens.push(data.token);
            drawBoard();

            ws.send(JSON.stringify({
                type: "token_add",
                token: data.token
            }));
        })
        .catch(err => console.error("Error en add_token:", err));
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


if (mapSelector) {
    mapSelector.addEventListener("change", () => {
        const selected = mapSelector.value;
        if (!selected) return;

        fetch(`/boards/${boardId}/set_map/`, {
            method: "POST",
            headers: {
                "X-CSRFToken": getCSRFToken(),
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `map=${selected}`
        }).then(() => {
            const url = `/static/assets/maps/${selected}`;

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
        });
    });
}

if (backgroundUrl) {
    backgroundImage = new Image();
    backgroundImage.src = backgroundUrl;

    backgroundImage.onload = () => {
        const scaleX = CANVAS_WIDTH / backgroundImage.width;
        const scaleY = CANVAS_HEIGHT / backgroundImage.height;
        scale = Math.min(scaleX, scaleY);
        drawBoard();
    };
}

fetch(`/boards/${boardId}/tokens/`)
    .then(response => response.json())
    .then(data => {
        tokens = data.tokens;
        drawBoard();
    });

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

function drawTokens() {
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    tokens.forEach(token => {
        ctx.beginPath();
        ctx.arc(token.x, token.y, 15 / scale, 0, Math.PI * 2);
        ctx.fillStyle = token.color || "#ff0000";
        ctx.fill();

        ctx.fillStyle = "white";
        ctx.font = `${12 / scale}px Arial`;
        ctx.fillText(token.label || "", token.x - 10 / scale, token.y - 20 / scale);
    });

    ctx.restore();
}

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

    if (role !== "DM") return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - offsetX) / scale;
    const mouseY = (e.clientY - rect.top - offsetY) / scale;

    const token = tokens.find(t => Math.hypot(t.x - mouseX, t.y - mouseY) <= 15 / scale);

    if (token) {
        draggingToken = token;
        dragOffsetX = mouseX - token.x;
        dragOffsetY = mouseY - token.y;
    }
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

function renderChat() {
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

if (chatSendBtn && chatInput) {
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

};
