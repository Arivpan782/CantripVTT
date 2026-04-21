const root = document.getElementById("board-root");
if (!root) {
    console.error("No se encontró #board-root");
}

const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const chatSendBtn = document.getElementById("chat-send-btn");

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

const imageCache = {};

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

function openTokenMenu(x, y, token) {
    const menu = document.getElementById("token-menu");
    if (!menu) return;

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.remove("hidden");

    menu.dataset.tokenId = token.id;
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

const deleteTokenBtn = document.getElementById("delete-token-btn");

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




document.addEventListener("DOMContentLoaded", () => {

    const diceModal = document.getElementById("dice-modal");
    const openDiceBtn = document.getElementById("open-dice-btn");
    const closeDiceBtn = document.getElementById("dice-close");

    if (!diceModal) {
        console.warn("Dice modal not found in DOM.");
        return;
    }

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
            const count = parseInt(countInput.value);

            fetch(`/boards/${boardId}/roll_dice/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCSRFToken(),
                },
                body: JSON.stringify({ sides, count })
            }).catch(err => console.error("Error enviando tirada:", err));

            diceModal.classList.add("hidden");
        });
    });

});



const addTokenBtn = document.getElementById("add-token-btn");
const addTokenModal = document.getElementById("add-token-modal");
const closeAddToken = document.getElementById("close-add-token");
const manualName = document.getElementById("manual-token-name").value;

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

let selectedType = null;
let selectedCharacterId = null;
let selectedStaticPath = null;
let selectedUploadFile = null;

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

const uploadInput = document.getElementById("token-upload");

if (uploadInput) {
    uploadInput.addEventListener("change", () => {
        if (uploadInput.files.length > 0) {
            selectedType = "upload";
            selectedUploadFile = uploadInput.files[0];
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

document.addEventListener("DOMContentLoaded", () => {

    const root = document.getElementById("board-root");
    const uploadUrl = root.dataset.uploadMapUrl;
    const staticBase = root.dataset.staticBase;
    const csrf = root.dataset.csrf;

    const mapModal = document.getElementById("add-map-modal");
    const openMapBtn = document.getElementById("add-map-btn");
    const closeMapBtn = document.getElementById("close-add-map");
    const applyMapBtn = document.getElementById("apply-map-btn");
    const uploadInput = document.getElementById("map-upload");

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

            if (uploadInput) {
                uploadInput.value = "";
            }
        });
    });


    if (uploadInput) {
        uploadInput.addEventListener("change", () => {
            selectedMap = null;
            uploadedMap = uploadInput.files[0] || null;

            document.querySelectorAll("#add-map-modal .map-choice")
                .forEach(c => c.classList.remove("selected"));
        });

    }

    applyMapBtn.addEventListener("click", () => {

        if (uploadedMap) {
            const formData = new FormData();
            formData.append("map", uploadedMap);

            fetch(uploadUrl, {
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
                uploadInput.value = "";
            });

            return;
        }

        if (selectedMap) {
            const url = staticBase + "assets/maps/" + selectedMap;

            backgroundImage = new Image();
            backgroundImage.onload = () => drawBoard();
            backgroundImage.src = url;

            root.dataset.background = url;

            mapModal.classList.add("hidden");
        }
    });

});
