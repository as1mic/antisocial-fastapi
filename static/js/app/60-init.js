function initCommonEvents() {
    const logoutButton = element("logout-button");
    if (logoutButton) {
        logoutButton.addEventListener("click", handleLogout);
    }

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeImageViewer();
        }
    });
}

function initAuthPage() {
    loadCurrentUser();
    element("show-login").addEventListener("click", showLoginForm);
    element("show-register").addEventListener("click", showRegisterForm);
    element("login-form").addEventListener("submit", handleLogin);
    element("register-form").addEventListener("submit", handleRegister);
}

function initCreatePostPage() {
    if (!requireAuth()) {
        return;
    }

    loadCurrentUser();
    element("post-form").addEventListener("submit", handleCreatePost);
    element("post-image-url").addEventListener("input", refreshCreatePostImagePreview);
    element("post-image-file").addEventListener("change", refreshCreatePostImagePreview);
}

function initFeedPage() {
    loadFeedPage();
    const form = element("filter-form");
    const loadMoreButton = element("load-more-button");

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        try {
            await loadFeedPosts();
        } catch (error) {
            showMessage(error.message, true);
        }
    });

    if (loadMoreButton) {
        loadMoreButton.addEventListener("click", loadMoreFeedPosts);
    }
}

function initProfilePage() {
    loadProfilePage();
    const editButton = element("edit-profile-button");
    const cancelButton = element("cancel-profile-edit");
    const profileForm = element("profile-form");

    editButton.addEventListener("click", function () {
        element("profile-form").classList.toggle("hidden");
    });
    cancelButton.addEventListener("click", function () {
        profileForm.classList.add("hidden");
    });
    profileForm.addEventListener("submit", handleProfileUpdate);
}

function initPostPage() {
    loadPostPage();
}

function initEditPostPage() {
    loadEditPostPage();
    element("edit-post-form").addEventListener("submit", handleEditPostSubmit);
    element("edit-post-image-url").addEventListener("input", refreshEditPostImagePreview);
}

function initSavedPage() {
    loadSavedPage();
}

function initActivityPage() {
    loadActivityPage();
}

function initUserPage() {
    loadUserPage();

    const hateFollowButton = element("hate-follow-button");
    if (hateFollowButton) {
        hateFollowButton.addEventListener("click", toggleHateFollow);
    }
}

window.submitReaction = submitReaction;
window.toggleComments = toggleComments;
window.submitComment = submitComment;
window.submitModalComment = submitModalComment;
window.openPostModal = openPostModal;
window.closePostModal = closePostModal;
window.deletePost = deletePost;
window.editPost = editPost;
window.editComment = editComment;
window.deleteComment = deleteComment;
window.toggleSavedPost = toggleSavedPost;
window.openImageViewer = openImageViewer;
window.closeImageViewer = closeImageViewer;

initCommonEvents();

const currentPage = pageName();

if (currentPage === "auth") {
    initAuthPage();
}

if (currentPage === "create-post") {
    initCreatePostPage();
}

if (currentPage === "feed") {
    initFeedPage();
}

if (currentPage === "profile") {
    initProfilePage();
}

if (currentPage === "saved") {
    initSavedPage();
}

if (currentPage === "activity") {
    initActivityPage();
}

if (currentPage === "post") {
    initPostPage();
}

if (currentPage === "edit-post") {
    initEditPostPage();
}

if (currentPage === "user") {
    initUserPage();
}
