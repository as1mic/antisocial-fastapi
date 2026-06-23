function showMessage(text, isError = false) {
    const box = element("message-box");
    if (!box) {
        return;
    }

    box.textContent = text;
    box.classList.remove("hidden", "error");
    if (isError) {
        box.classList.add("error");
    }

    window.clearTimeout(showMessage.timeoutId);
    showMessage.timeoutId = window.setTimeout(function () {
        box.classList.add("hidden");
    }, 3000);
}

function ensureImageViewer() {
    let viewer = element("image-viewer");
    if (viewer) {
        return viewer;
    }

    viewer = document.createElement("div");
    viewer.id = "image-viewer";
    viewer.className = "image-viewer hidden";
    viewer.innerHTML = `
        <div class="image-viewer-backdrop" onclick="closeImageViewer()"></div>
        <div class="image-viewer-content">
            <button class="image-viewer-close" type="button" onclick="closeImageViewer()">Close</button>
            <img id="image-viewer-photo" class="image-viewer-photo" alt="Preview">
        </div>
    `;

    document.body.appendChild(viewer);
    return viewer;
}

function openImageViewer(imageUrl) {
    const viewer = ensureImageViewer();
    const photo = element("image-viewer-photo");
    if (!photo) {
        return;
    }

    photo.src = imageUrl;
    viewer.classList.remove("hidden");
}

function closeImageViewer() {
    const viewer = element("image-viewer");
    const photo = element("image-viewer-photo");

    if (viewer) {
        viewer.classList.add("hidden");
    }

    if (photo) {
        photo.removeAttribute("src");
    }
}

function setImagePreview(previewBoxId, previewImageId, imageUrl) {
    const box = element(previewBoxId);
    const image = element(previewImageId);

    if (!box || !image) {
        return;
    }

    if (!imageUrl) {
        box.classList.add("hidden");
        image.removeAttribute("src");
        return;
    }

    image.src = imageUrl;
    box.classList.remove("hidden");
}

async function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onload = function () {
            resolve(String(reader.result || ""));
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function refreshCreatePostImagePreview() {
    const imageFileInput = element("post-image-file");
    const imageUrlInput = element("post-image-url");

    if (imageFileInput && imageFileInput.files && imageFileInput.files[0]) {
        const dataUrl = await readFileAsDataUrl(imageFileInput.files[0]);
        setImagePreview("post-image-preview-box", "post-image-preview", dataUrl);
        return;
    }

    const imageUrl = imageUrlInput ? imageUrlInput.value.trim() : "";
    setImagePreview("post-image-preview-box", "post-image-preview", imageUrl);
}

function refreshEditPostImagePreview() {
    const imageUrlInput = element("edit-post-image-url");
    const imageUrl = imageUrlInput ? imageUrlInput.value.trim() : "";
    setImagePreview("edit-post-image-preview-box", "edit-post-image-preview", imageUrl);
}

function formatDate(value) {
    return new Date(value).toLocaleString();
}

function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function updateHeader() {
    const badge = element("session-badge");
    const logoutButton = element("logout-button");

    if (badge) {
        badge.textContent = state.currentUser
            ? `Logged in as @${state.currentUser.username}`
            : "Guest mode";
    }

    if (logoutButton) {
        logoutButton.classList.toggle("hidden", !state.currentUser);
    }
}
