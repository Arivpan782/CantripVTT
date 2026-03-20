document.addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("board-root");
    if (!root) return;

    const boardId = root.dataset.boardId;
    const role = root.dataset.role;
    const backgroundUrl = root.dataset.background;

    const canvas = document.createElement("canvas");
    canvas.style.border = "1px solid #444";
    root.appendChild(canvas);

    const ctx = canvas.getContext("2d");

    let backgroundImage = null;
    let tokens = [];
    let draggingToken = null;
    let offsetX = 0;
    let offsetY = 0;

    let tokensLoaded = false;
    let imageLoaded = false;

    function tryDraw() {
        if (tokensLoaded && imageLoaded) {
            drawBoard();
        }
    }

    fetch(`/boards/${boardId}/tokens/`)
        .then(response => response.json())
        .then(data => {
            tokens = data.tokens;
            tokensLoaded = true;
            tryDraw();
        });

    if (backgroundUrl) {
        backgroundImage = new Image();
        backgroundImage.src = backgroundUrl;

        backgroundImage.onload = () => {
            canvas.width = backgroundImage.width;
            canvas.height = backgroundImage.height;
            imageLoaded = true;
            tryDraw();
        };
    }

    function drawTokens() {
        tokens.forEach(token => {
            ctx.beginPath();
            ctx.arc(token.x, token.y, 15, 0, Math.PI * 2);
            ctx.fillStyle = token.color || "#ff0000";
            ctx.fill();

            ctx.fillStyle = "white";
            ctx.font = "12px Arial";
            ctx.fillText(token.label || "", token.x - 10, token.y - 20);
        });
    }

    function drawBoard() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (backgroundImage) {
            ctx.drawImage(backgroundImage, 0, 0);
        }

        drawTokens();
    }

    function getTokenAtPosition(x, y) {
        return tokens.find(token => {
            const dx = x - token.x;
            const dy = y - token.y;
            return Math.sqrt(dx * dx + dy * dy) <= 15;
        });
    }

    canvas.addEventListener("mousedown", (e) => {
        if (role !== "DM") return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const token = getTokenAtPosition(mouseX, mouseY);
        if (token) {
            draggingToken = token;
            offsetX = mouseX - token.x;
            offsetY = mouseY - token.y;
        }
    });

    canvas.addEventListener("mousemove", (e) => {
        if (!draggingToken) return;

        const rect = canvas.getBoundingClientRect();
        draggingToken.x = e.clientX - rect.left - offsetX;
        draggingToken.y = e.clientY - rect.top - offsetY;

        drawBoard();
    });

    canvas.addEventListener("mouseup", () => {
        if (!draggingToken) return;

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

        draggingToken = null;
    });

    function getCSRFToken() {
        const cookieValue = document.cookie
            .split("; ")
            .find(row => row.startsWith("csrftoken="));
        return cookieValue ? cookieValue.split("=")[1] : "";
    }
});
