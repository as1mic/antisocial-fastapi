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

async function handleDemoSeed() {
    const button = element("demo-seed-button");
    if (button) {
        button.disabled = true;
        button.textContent = "Creating...";
    }

    try {
        const result = await apiFetch("/demo/seed", {
            method: "POST",
        });

        renderDemoCredentials(result.credentials || []);
        await loadAuthOnboarding();
        showMessage("Demo data created.");
    } catch (error) {
        showMessage(error.message, true);
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = "Fill demo data";
        }
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
        setImagePreview("post-image-preview-box", "post-image-preview", "");
        showMessage("Post published.");
        window.location.href = "/";
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function handleProfileUpdate(event) {
    event.preventDefault();

    const payload = {
        username: element("settings-username").value.trim(),
        email: element("settings-email").value.trim(),
        bio: element("settings-bio").value.trim(),
    };

    try {
        await apiFetch("/users/me", {
            method: "PATCH",
            body: JSON.stringify(payload),
        });

        await loadSettingsPage();
        showMessage("Profile updated.");
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function handlePasswordUpdate(event) {
    event.preventDefault();

    const payload = {
        current_password: element("settings-current-password").value,
        new_password: element("settings-new-password").value,
    };

    try {
        await apiFetch("/users/me/password", {
            method: "PATCH",
            body: JSON.stringify(payload),
        });

        element("settings-password-form").reset();
        showMessage("Password updated.");
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

async function toggleHateFollow() {
    const userId = currentUserIdFromUrl();
    if (!userId) {
        return;
    }

    const button = element("hate-follow-button");
    if (button) {
        button.disabled = true;
    }

    try {
        const shouldRemove = button && button.textContent === "Remove hate-follow";

        await apiFetch(`/users/${userId}/hate-follow`, {
            method: shouldRemove ? "DELETE" : "POST",
        });

        await loadUserPage();
        showMessage(shouldRemove ? "Hate-follow removed." : "Hate-follow added.");
    } catch (error) {
        showMessage(error.message, true);
    } finally {
        if (button) {
            button.disabled = false;
        }
    }
}

async function toggleSavedPost(postId) {
    if (!requireAuth()) {
        return;
    }

    const saved = isPostSaved(postId);

    try {
        await apiFetch(`/posts/${postId}/save`, {
            method: saved ? "DELETE" : "POST",
        });

        await loadSavedPostIds();
        await reloadCurrentPage();
        showMessage(saved ? "Post removed from saved." : "Post saved.");
    } catch (error) {
        showMessage(error.message, true);
    }
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

        const localPostIndex = state.posts.findIndex(function (item) {
            return item.id === postId;
        });
        if (localPostIndex >= 0) {
            state.posts[localPostIndex] = {
                ...state.posts[localPostIndex],
                ...post,
            };
        }

        const imageHtml = post.image_url
            ? `<img class="modal-image" src="${escapeHtml(post.image_url)}" alt="Post image" onclick="openImageViewer(this.src)">`
            : "";
        const canManage = state.currentUser && state.currentUser.id === post.author_id;
        const manageButtons = canManage
            ? `
                <button class="ghost-button small-button" type="button" onclick="editPost(${post.id})">Edit post</button>
                <button class="ghost-button delete-button small-button" type="button" onclick="deletePost(${post.id})">Delete post</button>
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
                <div class="inline-actions">
                    ${renderSaveButton(post.id)}
                    ${manageButtons}
                </div>
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
        await reloadCurrentPage();
        showMessage("Comment added.");
    } catch (error) {
        showMessage(error.message, true);
    }
}
