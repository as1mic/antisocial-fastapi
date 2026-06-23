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
        state.savedPostIds = [];
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

async function loadSavedPostIds() {
    if (!state.token) {
        state.savedPostIds = [];
        return;
    }

    state.savedPostIds = await apiFetch("/posts/saved/ids");
}

function isPostSaved(postId) {
    return state.savedPostIds.includes(postId);
}

async function loadDemoStatus() {
    return apiFetch("/demo/status");
}

async function loadReactionSelections(posts) {
    if (!state.currentUser || !posts.length) {
        return;
    }

    for (const post of posts) {
        const reactionsData = await apiFetch(`/posts/${post.id}/reactions`);
        const myReaction = reactionsData.reactions.find(function (reaction) {
            return reaction.user_id === state.currentUser.id;
        });

        post.my_reaction = myReaction ? myReaction.reaction_type : "";
    }
}
