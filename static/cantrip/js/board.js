
const root = document.getElementById("board-root");
if (!root) {
    console.error("No se encontró #board-root");
}

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



const boardId = root.dataset.boardId;
const role = root.dataset.role;
const backgroundUrl = root.dataset.background;



const addBtn = document.getElementById("add-token-btn");
const clearBtn = document.getElementById("clear-tokens-btn");
const mapSelector = document.getElementById("map-selector");

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
        }).then(() => location.reload());
    });
}

if (clearBtn) {
    clearBtn.addEventListener("click", () => {
        fetch(`/boards/${boardId}/clear_tokens/`, {
            method: "POST",
            headers: { "X-CSRFToken": getCSRFToken() }
        }).then(() => location.reload());
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
        }).then(() => location.reload());
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
    }

    draggingToken = null;
    panning = false;
});
