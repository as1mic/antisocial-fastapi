function renderRating(users) {
    const container = element("rating-list");
    if (!container) {
        return;
    }

    if (!users.length) {
        container.innerHTML = '<div class="empty-state">No rating data yet.</div>';
        return;
    }

    container.innerHTML = users.map(function (user, index) {
        return `
            <div class="list-row">
                <div>
                    <strong>#${index + 1} <a class="author-link" href="${userPageUrl(user.user_id)}">@${escapeHtml(user.username)}</a></strong>
                    <span>${user.posts_count} posts, ${user.haters_count} haters</span>
                </div>
                <strong>${user.score}</strong>
            </div>
        `;
    }).join("");
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

    container.innerHTML = items.map(function (item) {
        return `
            <div class="list-row">
                <div>
                    <strong>${escapeHtml(item.title)}</strong>
                    <span>${escapeHtml(item.description)}</span>
                </div>
            </div>
        `;
    }).join("");
}

function renderComments(comments) {
    if (!comments.length) {
        return '<div class="empty-state">No comments yet.</div>';
    }

    return comments.map(function (comment) {
        return `
            <article class="comment-card">
                <div class="comment-meta">
                    <strong>@${escapeHtml(comment.author_username || "unknown")}</strong>
                    <span>${formatDate(comment.created_at)}</span>
                </div>
                <p>${escapeHtml(comment.content)}</p>
                ${renderCommentActions(comment)}
            </article>
        `;
    }).join("");
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

function renderSaveButton(postId) {
    const saved = isPostSaved(postId);
    const activeClass = saved ? "active" : "";
    const label = saved ? "Saved" : "Save";

    return `
        <button
            class="ghost-button small-button ${activeClass}"
            type="button"
            onclick="toggleSavedPost(${postId})"
        >
            ${label}
        </button>
    `;
}

function renderPostCard(post) {
    const comments = state.commentsByPost[post.id] || [];
    const imageHtml = post.image_url
        ? `<img class="post-image" src="${escapeHtml(post.image_url)}" alt="Post image" onclick="openImageViewer(this.src)">`
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
                    <div class="post-author"><a class="author-link" href="${userPageUrl(post.author_id)}">@${escapeHtml(post.author_username || "unknown")}</a></div>
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
                    ${renderSaveButton(post.id)}
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

function updateLoadMoreButton() {
    const button = element("load-more-button");
    if (!button) {
        return;
    }

    button.classList.toggle("hidden", !state.feedHasMore);
    button.disabled = false;
    button.textContent = "Load more";
}

function renderActivityComments(items) {
    const container = element("activity-comments-list");
    if (!container) {
        return;
    }

    if (!items.length) {
        container.innerHTML = '<div class="empty-state">No comments yet.</div>';
        return;
    }

    container.innerHTML = items.map(function (item) {
        return `
            <article class="comment-card">
                <div class="comment-meta">
                    <strong><a class="author-link" href="${postPageUrl(item.post_id)}">${escapeHtml(item.post_title)}</a></strong>
                    <span>${formatDate(item.created_at)}</span>
                </div>
                <p>${escapeHtml(item.content)}</p>
            </article>
        `;
    }).join("");
}

function renderActivityReactions(items) {
    const container = element("activity-reactions-list");
    if (!container) {
        return;
    }

    if (!items.length) {
        container.innerHTML = '<div class="empty-state">No reactions yet.</div>';
        return;
    }

    container.innerHTML = items.map(function (item) {
        return `
            <div class="list-row">
                <div>
                    <strong><a class="author-link" href="${postPageUrl(item.post_id)}">${escapeHtml(item.post_title)}</a></strong>
                    <span>${reactionLabels[item.reaction_type]} reaction</span>
                </div>
                <span>${formatDate(item.created_at)}</span>
            </div>
        `;
    }).join("");
}

function renderSinglePost(post) {
    const container = element("single-post-view");
    if (!container) {
        return;
    }

    const comments = state.commentsByPost[post.id] || [];
    const imageHtml = post.image_url
        ? `<img class="post-image" src="${escapeHtml(post.image_url)}" alt="Post image" onclick="openImageViewer(this.src)">`
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
                        <div class="post-author"><a class="author-link" href="${userPageUrl(post.author_id)}">@${escapeHtml(post.author_username || "unknown")}</a></div>
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
                        ${renderSaveButton(post.id)}
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

function renderDemoCredentials(items) {
    const container = element("demo-credentials-box");
    if (!container) {
        return;
    }

    if (!items.length) {
        container.classList.add("hidden");
        container.innerHTML = "";
        return;
    }

    container.classList.remove("hidden");
    container.innerHTML = items.map(function (item) {
        return `
            <div class="list-row">
                <div>
                    <strong>@${escapeHtml(item.username)}</strong>
                    <span>${escapeHtml(item.email)} | password: ${escapeHtml(item.password)}</span>
                </div>
            </div>
        `;
    }).join("");
}
