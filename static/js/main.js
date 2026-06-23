const state = {
    token: localStorage.getItem("antisocial_token") || "",
    currentUser: null,
    posts: [],
    commentsByPost: {},
    openModalPostId: null,
};

const reactionLabels = {
    tough: "Tough",
    your_fault: "Your fault",
    had_worse: "Had worse",
    rest_in_peace: "R.I.P.",
};

function element(id) {
    return document.getElementById(id);
}

function pageName() {
    return document.body.dataset.page || "";
}

function postPageUrl(postId) {
    return `/post/${postId}`;
}

function editPostPageUrl(postId) {
    return `/post/${postId}/edit`;
}

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
    showMessage.timeoutId = window.setTimeout(() => {
        box.classList.add("hidden");
    }, 3000);
}

async function apiFetch(url, options = {}) {
    const isFormData = options.body instanceof FormData;
    const headers = { ...(options.headers || {}) };

    if (!isFormData) {
        headers["Content-Type"] = "application/json";
    }

    if (state.token) {
        headers.Authorization = `Bearer ${state.token}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
        let message = "Request failed";
        try {
            const data = await response.json();
            message = data.detail || message;
        } catch (error) {
            message = response.statusText || message;
        }
        throw new Error(message);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

function saveToken(token) {
    state.token = token;
    if (token) {
        localStorage.setItem("antisocial_token", token);
    } else {
        localStorage.removeItem("antisocial_token");
    }
}

function formatDate(value) {
    return new Date(value).toLocaleString();
}

function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
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

async function reloadCommentsForPost(postId) {
    state.commentsByPost[postId] = await apiFetch(`/posts/${postId}/comments`);

    const commentList = element(`comment-list-${postId}`);
    if (commentList) {
        commentList.innerHTML = renderComments(state.commentsByPost[postId]);
    }

    if (state.openModalPostId === postId) {
        await openPostModal(postId);
    }
}

async function loadCurrentUser() {
    if (!state.token) {
        state.currentUser = null;
        updateHeader();
        return null;
    }

    try {
        state.currentUser = await apiFetch("/auth/me");
    } catch (error) {
        saveToken("");
        state.currentUser = null;
        showMessage(error.message, true);
    }

    updateHeader();
    return state.currentUser;
}

function requireAuth(redirectPath = "/auth") {
    if (!state.token) {
        window.location.href = redirectPath;
        return false;
    }
    return true;
}

function renderRating(users) {
    const container = element("rating-list");
    if (!container) {
        return;
    }

    if (!users.length) {
        container.innerHTML = '<div class="empty-state">No rating data yet.</div>';
        return;
    }

    container.innerHTML = users.map((user, index) => `
        <div class="list-row">
            <div>
                <strong>#${index + 1} @${escapeHtml(user.username)}</strong>
                <span>${user.posts_count} posts, ${user.haters_count} haters</span>
            </div>
            <strong>${user.score}</strong>
        </div>
    `).join("");
}

function renderAchievements(items) {
    const container = element("achievement-list");
    if (!container) {
        return;
    }

    if (!items.length) {
        container.innerHTML = '<div class="empty-state">No achievements unlocked yet.</div>';
        return;
    }

    container.innerHTML = items.map((item) => `
        <div class="list-row">
            <div>
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(item.description)}</span>
            </div>
        </div>
    `).join("");
}

function renderComments(comments) {
    if (!comments.length) {
        return '<div class="empty-state">No comments yet.</div>';
    }

    return comments.map((comment) => `
        <article class="comment-card">
            <div class="comment-meta">
                <strong>@${escapeHtml(comment.author_username || "unknown")}</strong>
                <span>${formatDate(comment.created_at)}</span>
            </div>
            <p>${escapeHtml(comment.content)}</p>
            ${renderCommentActions(comment)}
        </article>
    `).join("");
}

function renderCommentActions(comment) {
    const canManage = state.currentUser && state.currentUser.id === comment.author_id;
    if (!canManage) {
        return "";
    }

    return `
        <div class="comment-actions">
            <button class="ghost-button small-button" type="button" onclick="editComment(${comment.id})">Edit</button>
            <button class="ghost-button delete-button small-button" type="button" onclick="deleteComment(${comment.id}, ${comment.post_id})">Delete</button>
        </div>
    `;
}

function renderReactionButton(post, type) {
    const activeClass = post.my_reaction === type ? "active" : "";

    return `
        <button
            class="reaction-button ${activeClass}"
            type="button"
            onclick="submitReaction(${post.id}, '${type}')"
        >
            ${reactionLabels[type]}
        </button>
    `;
}

function renderPostCard(post) {
    const comments = state.commentsByPost[post.id] || [];
    const imageHtml = post.image_url
        ? `<img class="post-image" src="${escapeHtml(post.image_url)}" alt="Post image" onclick="openPostModal(${post.id})">`
        : "";
    const canManage = state.currentUser && state.currentUser.id === post.author_id;
    const manageButtons = canManage
        ? `
            <button class="ghost-button small-button" type="button" onclick="editPost(${post.id})">Edit</button>
            <button class="ghost-button delete-button small-button" type="button" onclick="deletePost(${post.id})">Delete</button>
        `
        : "";

    return `
        <article class="post-card">
            <div class="post-topline">
                <div>
                    <div class="post-author">@${escapeHtml(post.author_username || "unknown")}</div>
                    <span class="post-category">${escapeHtml(post.category)}</span>
                </div>
                <span class="muted-text">${formatDate(post.created_at)}</span>
            </div>

            <h3 class="post-title">${escapeHtml(post.title)}</h3>
            <p class="post-body">${escapeHtml(post.content)}</p>
            ${imageHtml}

            <div class="post-meta">
                <span>${post.comments_count} comments</span>
                <span>${post.reactions_count} reactions</span>
            </div>

            <div class="post-actions-row">
                <div class="post-primary-actions">
                    <a class="ghost-link-button" href="${postPageUrl(post.id)}">Open page</a>
                    <button class="comment-toggle" type="button" onclick="openPostModal(${post.id})">
                        Quick view
                    </button>
                </div>
                <div class="inline-actions">
                    ${manageButtons}
                </div>
            </div>

            <div class="reaction-row">
                ${renderReactionButton(post, "tough")}
                ${renderReactionButton(post, "your_fault")}
                ${renderReactionButton(post, "had_worse")}
                ${renderReactionButton(post, "rest_in_peace")}
            </div>
            <button class="comment-toggle" type="button" onclick="toggleComments(${post.id})">
                Show comments
            </button>

            <div class="comment-section hidden" id="comments-${post.id}">
                <form class="comment-form" onsubmit="submitComment(event, ${post.id})">
                    <textarea id="comment-input-${post.id}" placeholder="Write a comment..." required></textarea>
                    <button class="secondary-button" type="submit">Send</button>
                </form>
                <div id="comment-list-${post.id}">
                    ${renderComments(comments)}
                </div>
            </div>
        </article>
    `;
}

function renderFeed(posts, containerId) {
    const container = element(containerId);
    if (!container) {
        return;
    }

    if (!posts.length) {
        container.innerHTML = '<div class="empty-state">No posts found yet.</div>';
        return;
    }

    container.innerHTML = posts.map(renderPostCard).join("");
}

async function loadReactionSelections(posts) {
    if (!state.currentUser || !posts.length) {
        return;
    }

    for (const post of posts) {
        const reactionsData = await apiFetch(`/posts/${post.id}/reactions`);
        const myReaction = reactionsData.reactions.find(
            (reaction) => reaction.user_id === state.currentUser.id
        );

        post.my_reaction = myReaction ? myReaction.reaction_type : "";
    }
}

async function loadFeedPosts() {
    const params = new URLSearchParams();
    const searchInput = element("search-input");
    const categoryInput = element("filter-category");

    if (searchInput && searchInput.value.trim()) {
        params.set("search", searchInput.value.trim());
    }

    if (categoryInput && categoryInput.value) {
        params.set("category", categoryInput.value);
    }

    const url = params.toString() ? `/posts?${params.toString()}` : "/posts";
    const posts = await apiFetch(url);

    state.posts = [];
    for (const post of posts) {
        state.posts.push({
            ...post,
            my_reaction: "",
        });
    }

    await loadReactionSelections(state.posts);
    renderFeed(state.posts, "feed-list");
}

async function loadProfilePage() {
    if (!requireAuth()) {
        return;
    }

    await loadCurrentUser();
    if (!state.currentUser) {
        return;
    }

    const profile = await apiFetch(`/users/${state.currentUser.id}`);
    const posts = await apiFetch(`/users/${state.currentUser.id}/posts`);
    const rating = await apiFetch("/users/rating");
    const achievements = await apiFetch(`/users/${state.currentUser.id}/achievements`);

    const myRating = rating.find((item) => item.user_id === state.currentUser.id);

    element("profile-name").textContent = `@${profile.username}`;
    element("profile-bio").textContent = profile.bio || "No bio yet.";
    element("profile-haters").textContent = String(profile.haters_count);
    element("profile-posts").textContent = String(posts.length);
    element("profile-score").textContent = myRating ? String(myRating.score) : "0";

    element("profile-username").value = profile.username || "";
    element("profile-email").value = profile.email || "";
    element("profile-bio-input").value = profile.bio || "";

    state.posts = [];
    for (const post of posts) {
        state.posts.push({
            ...post,
            my_reaction: "",
        });
    }

    await loadReactionSelections(state.posts);
    renderFeed(state.posts, "profile-posts-list");
    renderAchievements(achievements);
}

async function loadFeedPage() {
    await loadCurrentUser();
    const rating = await apiFetch("/users/rating");
    renderRating(rating);
    await loadFeedPosts();
}

async function reloadCurrentPage() {
    if (pageName() === "profile") {
        await loadProfilePage();
        return;
    }

    if (pageName() === "post") {
        await loadPostPage();
        return;
    }

    await loadFeedPosts();
}

async function handleLogin(event) {
    event.preventDefault();

    const payload = {
        login: element("login-value").value.trim(),
        password: element("login-password").value,
    };

    try {
        const data = await apiFetch("/auth/login", {
            method: "POST",
            body: JSON.stringify(payload),
        });

        saveToken(data.access_token);
        window.location.href = "/";
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function handleRegister(event) {
    event.preventDefault();

    const payload = {
        username: element("register-username").value.trim(),
        email: element("register-email").value.trim(),
        password: element("register-password").value,
        bio: element("register-bio").value.trim() || null,
    };

    try {
        await apiFetch("/auth/register", {
            method: "POST",
            body: JSON.stringify(payload),
        });

        showMessage("Account created. Now log in.");
        element("register-form").reset();
        showLoginForm();
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function handleCreatePost(event) {
    event.preventDefault();

    if (!requireAuth()) {
        return;
    }

    const formData = new FormData();
    const imageFile = element("post-image-file").files[0];

    formData.append("title", element("post-title").value.trim());
    formData.append("image_url", element("post-image-url").value.trim());
    formData.append("content", element("post-content").value.trim());
    formData.append("category", element("post-category").value);

    if (imageFile) {
        formData.append("image", imageFile);
    }

    try {
        await apiFetch("/posts", {
            method: "POST",
            body: formData,
        });

        element("post-form").reset();
        element("post-category").value = "university";
        showMessage("Post published.");
        window.location.href = "/";
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function handleProfileUpdate(event) {
    event.preventDefault();

    const payload = {
        username: element("profile-username").value.trim(),
        email: element("profile-email").value.trim(),
        bio: element("profile-bio-input").value.trim(),
    };

    try {
        await apiFetch("/users/me", {
            method: "PATCH",
            body: JSON.stringify(payload),
        });

        element("profile-form").classList.add("hidden");
        await loadProfilePage();
        showMessage("Profile updated.");
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function handleEditPostSubmit(event) {
    event.preventDefault();

    if (!requireAuth()) {
        return;
    }

    const postId = currentPostIdFromUrl();
    if (!postId) {
        showMessage("Post not found.", true);
        return;
    }

    const payload = {
        title: element("edit-post-title").value.trim(),
        image_url: element("edit-post-image-url").value.trim() || null,
        content: element("edit-post-content").value.trim(),
        category: element("edit-post-category").value,
    };

    try {
        await apiFetch(`/posts/${postId}`, {
            method: "PUT",
            body: JSON.stringify(payload),
        });

        showMessage("Post updated.");
        window.location.href = postPageUrl(postId);
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function handleLogout() {
    saveToken("");
    state.currentUser = null;
    window.location.href = "/auth";
}

function showLoginForm() {
    element("login-form").classList.remove("hidden");
    element("register-form").classList.add("hidden");
    element("show-login").classList.add("active");
    element("show-register").classList.remove("active");
}

function showRegisterForm() {
    element("login-form").classList.add("hidden");
    element("register-form").classList.remove("hidden");
    element("show-login").classList.remove("active");
    element("show-register").classList.add("active");
}

async function submitReaction(postId, reactionType) {
    try {
        await apiFetch(`/posts/${postId}/reactions`, {
            method: "POST",
            body: JSON.stringify({ reaction_type: reactionType }),
        });

        await reloadCurrentPage();

        showMessage("Reaction saved.");
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function toggleComments(postId) {
    const section = element(`comments-${postId}`);
    if (!section) {
        return;
    }

    const opening = section.classList.contains("hidden");
    section.classList.toggle("hidden");

    if (!opening) {
        return;
    }

    try {
        await reloadCommentsForPost(postId);
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function submitComment(event, postId) {
    event.preventDefault();

    const input = element(`comment-input-${postId}`);
    const content = input.value.trim();
    if (!content) {
        return;
    }

    try {
        await apiFetch(`/posts/${postId}/comments`, {
            method: "POST",
            body: JSON.stringify({ content }),
        });

        await reloadCommentsForPost(postId);
        input.value = "";

        await reloadCurrentPage();
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function editPost(postId) {
    window.location.href = editPostPageUrl(postId);
}

async function deletePost(postId) {
    const confirmed = window.confirm("Delete this post?");
    if (!confirmed) {
        return;
    }

    try {
        await apiFetch(`/posts/${postId}`, {
            method: "DELETE",
        });

        if (state.openModalPostId === postId) {
            closePostModal();
        }

        if (pageName() === "post") {
            window.location.href = "/";
            return;
        }

        await reloadCurrentPage();

        showMessage("Post deleted.");
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function editComment(commentId) {
    let targetComment = null;

    for (const comments of Object.values(state.commentsByPost)) {
        for (const comment of comments) {
            if (comment.id === commentId) {
                targetComment = comment;
            }
        }
    }

    if (!targetComment) {
        return;
    }

    const content = window.prompt("Edit comment", targetComment.content);
    if (content === null) {
        return;
    }

    try {
        await apiFetch(`/comments/${commentId}`, {
            method: "PUT",
            body: JSON.stringify({ content: content.trim() }),
        });

        await reloadCommentsForPost(targetComment.post_id);
        await reloadCurrentPage();

        showMessage("Comment updated.");
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function deleteComment(commentId, postId) {
    const confirmed = window.confirm("Delete this comment?");
    if (!confirmed) {
        return;
    }

    try {
        await apiFetch(`/comments/${commentId}`, {
            method: "DELETE",
        });

        await reloadCommentsForPost(postId);
        await reloadCurrentPage();

        showMessage("Comment deleted.");
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function openPostModal(postId) {
    try {
        const post = await apiFetch(`/posts/${postId}`);
        const comments = await apiFetch(`/posts/${postId}/comments`);
        state.openModalPostId = postId;
        state.commentsByPost[postId] = comments;

        const localPostIndex = state.posts.findIndex((item) => item.id === postId);
        if (localPostIndex >= 0) {
            state.posts[localPostIndex] = {
                ...state.posts[localPostIndex],
                ...post,
            };
        }

        const imageHtml = post.image_url
            ? `<img class="modal-image" src="${escapeHtml(post.image_url)}" alt="Post image">`
            : "";
        const canManage = state.currentUser && state.currentUser.id === post.author_id;
        const manageButtons = canManage
            ? `
                <div class="inline-actions">
                    <button class="ghost-button small-button" type="button" onclick="editPost(${post.id})">Edit post</button>
                    <button class="ghost-button delete-button small-button" type="button" onclick="deletePost(${post.id})">Delete post</button>
                </div>
            `
            : "";
        const commentForm = state.currentUser
            ? `
                <form class="comment-form modal-comment-form" onsubmit="submitModalComment(event, ${post.id})">
                    <textarea id="modal-comment-input-${post.id}" placeholder="Write a comment..." required></textarea>
                    <button class="secondary-button" type="submit">Send</button>
                </form>
            `
            : '<div class="empty-state">Log in to write comments.</div>';

        element("modal-content").innerHTML = `
            <article class="modal-post">
                <div class="post-topline">
                    <div>
                        <div class="post-author">@${escapeHtml(post.author_username || "unknown")}</div>
                        <span class="post-category">${escapeHtml(post.category)}</span>
                    </div>
                    <span class="muted-text">${formatDate(post.created_at)}</span>
                </div>
                <h3 class="post-title">${escapeHtml(post.title)}</h3>
                <p class="post-body">${escapeHtml(post.content)}</p>
                ${imageHtml}
                <div class="post-meta">
                    <span>${post.comments_count} comments</span>
                    <span>${post.reactions_count} reactions</span>
                </div>
                ${manageButtons}
                <div class="modal-comments">
                    <h4>Comments</h4>
                    ${commentForm}
                    ${renderComments(comments)}
                </div>
            </article>
        `;

        element("post-modal").classList.remove("hidden");
    } catch (error) {
        showMessage(error.message, true);
    }
}

function closePostModal() {
    const modal = element("post-modal");
    if (modal) {
        modal.classList.add("hidden");
    }
    state.openModalPostId = null;
}

async function submitModalComment(event, postId) {
    event.preventDefault();

    const input = element(`modal-comment-input-${postId}`);
    if (!input) {
        return;
    }

    const content = input.value.trim();
    if (!content) {
        return;
    }

    try {
        await apiFetch(`/posts/${postId}/comments`, {
            method: "POST",
            body: JSON.stringify({ content }),
        });

        input.value = "";
        await openPostModal(postId);

        if (pageName() === "profile") {
            await loadProfilePage();
        } else {
            await loadFeedPosts();
        }

        showMessage("Comment added.");
    } catch (error) {
        showMessage(error.message, true);
    }
}

function initCommonEvents() {
    const logoutButton = element("logout-button");
    if (logoutButton) {
        logoutButton.addEventListener("click", handleLogout);
    }
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
}

function initFeedPage() {
    loadFeedPage();
    const form = element("filter-form");
    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        try {
            await loadFeedPosts();
        } catch (error) {
            showMessage(error.message, true);
        }
    });
}

function currentPostIdFromUrl() {
    const parts = window.location.pathname.split("/").filter(Boolean);

    for (let index = parts.length - 1; index >= 0; index -= 1) {
        const value = Number(parts[index]);
        if (Number.isInteger(value) && value > 0) {
            return value;
        }
    }

    return 0;
}

function renderSinglePost(post) {
    const container = element("single-post-view");
    if (!container) {
        return;
    }

    const comments = state.commentsByPost[post.id] || [];
    const imageHtml = post.image_url
        ? `<img class="post-image" src="${escapeHtml(post.image_url)}" alt="Post image">`
        : "";
    const canManage = state.currentUser && state.currentUser.id === post.author_id;
    const manageButtons = canManage
        ? `
            <button class="ghost-button small-button" type="button" onclick="editPost(${post.id})">Edit</button>
            <button class="ghost-button delete-button small-button" type="button" onclick="deletePost(${post.id})">Delete</button>
        `
        : "";

    container.innerHTML = `
        <div class="single-post-shell">
            <article class="post-card">
                <div class="post-topline">
                    <div>
                        <div class="post-author">@${escapeHtml(post.author_username || "unknown")}</div>
                        <span class="post-category">${escapeHtml(post.category)}</span>
                    </div>
                    <span class="muted-text">${formatDate(post.created_at)}</span>
                </div>

                <h1 class="post-title">${escapeHtml(post.title)}</h1>
                <p class="post-body">${escapeHtml(post.content)}</p>
                ${imageHtml}

                <div class="post-meta">
                    <span>${post.comments_count} comments</span>
                    <span>${post.reactions_count} reactions</span>
                </div>

                <div class="reaction-row">
                    ${renderReactionButton(post, "tough")}
                    ${renderReactionButton(post, "your_fault")}
                    ${renderReactionButton(post, "had_worse")}
                    ${renderReactionButton(post, "rest_in_peace")}
                </div>

                <div class="post-actions-row">
                    <div class="inline-actions">
                        ${manageButtons}
                    </div>
                </div>
            </article>

            <section class="comment-section">
                <h3>Comments</h3>
                <form class="comment-form" onsubmit="submitComment(event, ${post.id})">
                    <textarea id="comment-input-${post.id}" placeholder="Write a comment..." required></textarea>
                    <button class="secondary-button" type="submit">Send</button>
                </form>
                <div id="comment-list-${post.id}">
                    ${renderComments(comments)}
                </div>
            </section>
        </div>
    `;
}

async function loadPostPage() {
    await loadCurrentUser();

    const postId = currentPostIdFromUrl();
    if (!postId) {
        showMessage("Post not found.", true);
        return;
    }

    try {
        const post = await apiFetch(`/posts/${postId}`);
        state.posts = [{ ...post, my_reaction: "" }];
        state.commentsByPost[postId] = await apiFetch(`/posts/${postId}/comments`);
        await loadReactionSelections(state.posts);
        renderSinglePost(state.posts[0]);
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function loadEditPostPage() {
    if (!requireAuth()) {
        return;
    }

    await loadCurrentUser();

    const postId = currentPostIdFromUrl();
    if (!postId) {
        showMessage("Post not found.", true);
        return;
    }

    try {
        const post = await apiFetch(`/posts/${postId}`);

        if (!state.currentUser || state.currentUser.id !== post.author_id) {
            showMessage("You can only edit your own posts.", true);
            window.location.href = postPageUrl(postId);
            return;
        }

        element("edit-post-title").value = post.title || "";
        element("edit-post-image-url").value = post.image_url || "";
        element("edit-post-content").value = post.content || "";
        element("edit-post-category").value = post.category || "random";
        element("edit-back-link").href = postPageUrl(postId);
    } catch (error) {
        showMessage(error.message, true);
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

if (currentPage === "post") {
    initPostPage();
}

if (currentPage === "edit-post") {
    initEditPostPage();
}
