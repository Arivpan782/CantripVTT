document.addEventListener("DOMContentLoaded", () => {

    const modal = document.getElementById("static-token-modal");
    const openBtn = document.getElementById("open-static-token-modal");
    const closeBtn = document.getElementById("close-static-token");

    const choices = document.querySelectorAll(".token-choice");
    const selectField = document.getElementById("id_image_static");

    openBtn.addEventListener("click", () => {
        modal.classList.remove("hidden");
    });

    closeBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
    });

    choices.forEach(choice => {
        choice.addEventListener("click", () => {
            const path = choice.dataset.path;
            selectField.value = path;
            modal.classList.add("hidden");
        });
    });

});
