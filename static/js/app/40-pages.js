async function loadFeedPosts(options = {}) {
    const append = options.append || false;
    const limit = options.customLimit || state.feedPageSize;
    const skip = append ? state.posts.length : 0;
    const params = new URLSearchParams();
    const searchInput = element("search-input");
    const categoryInput = element("filter-category");
    const sortInput = element("filter-sort");

    if (searchInput && searchInput.value.trim()) {
        params.set("search", searchInput.value.trim());
    }

    if (categoryInput && categoryInput.value) {
        params.set("category", categoryInput.value);
    }

    if (sortInput && sortInput.value) {
        params.set("sort", sortInput.value);
    }

    params.set("skip", String(skip));
    params.set("limit", String(limit));

    const url = params.toString() ? `/posts?${params.toString()}` : "/posts";
    const posts = await apiFetch(url);
    const preparedPosts = [];

    for (const post of posts) {
        preparedPosts.push({
            ...post,
            my_reaction: "",
        });
    }

    await loadReactionSelections(preparedPosts);

    if (append) {
        state.posts = state.posts.concat(preparedPosts);
    } else {
        state.posts = preparedPosts;
    }

    state.feedHasMore = posts.length === limit;
    renderFeed(state.posts, "feed-list");
    updateLoadMoreButton();
}

async function loadProfilePage() {
    if (!requireAuth()) {
        return;
    }

    await loadCurrentUser();
    await loadSavedPostIds();
    if (!state.currentUser) {
        return;
    }

    const profile = await apiFetch(`/users/${state.currentUser.id}`);
    const posts = await apiFetch(`/users/${state.currentUser.id}/posts`);
    const rating = await apiFetch("/users/rating");
    const achievements = await apiFetch(`/users/${state.currentUser.id}/achievements`);
    const myRating = rating.find(function (item) {
        return item.user_id === state.currentUser.id;
    });

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
    await loadSavedPostIds();
    const rating = await apiFetch("/users/rating");
    renderRating(rating);
    await loadFeedPosts();
}

async function loadSavedPage() {
    if (!requireAuth()) {
        return;
    }

    await loadCurrentUser();
    await loadSavedPostIds();

    try {
        const posts = await apiFetch("/posts/saved");

        state.posts = [];
        for (const post of posts) {
            state.posts.push({
                ...post,
                my_reaction: "",
            });
        }

        await loadReactionSelections(state.posts);
        renderFeed(state.posts, "saved-posts-list");
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function loadActivityPage() {
    if (!requireAuth()) {
        return;
    }

    await loadCurrentUser();
    await loadSavedPostIds();

    try {
        const comments = await apiFetch("/users/me/comments");
        const reactions = await apiFetch("/users/me/reactions");
        const savedPosts = await apiFetch("/posts/saved");

        state.posts = [];
        for (const post of savedPosts) {
            state.posts.push({
                ...post,
                my_reaction: "",
            });
        }

        await loadReactionSelections(state.posts);
        renderActivityComments(comments);
        renderActivityReactions(reactions);
        renderFeed(state.posts, "activity-saved-posts-list");
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function loadUserPage() {
    if (!requireAuth()) {
        return;
    }

    await loadCurrentUser();
    await loadSavedPostIds();

    const userId = currentUserIdFromUrl();
    if (!userId) {
        showMessage("User not found.", true);
        return;
    }

    try {
        const profile = await apiFetch(`/users/${userId}`);
        const posts = await apiFetch(`/users/${userId}/posts`);
        const rating = await apiFetch("/users/rating");
        const achievements = await apiFetch(`/users/${userId}/achievements`);
        const userRating = rating.find(function (item) {
            return item.user_id === userId;
        });
        const isOwnProfile = state.currentUser && state.currentUser.id === userId;
        const hateFollowButton = element("hate-follow-button");

        element("view-user-name").textContent = `@${profile.username}`;
        element("view-user-bio").textContent = profile.bio || "No bio yet.";
        element("view-user-haters").textContent = String(profile.haters_count);
        element("view-user-posts-count").textContent = String(posts.length);
        element("view-user-score").textContent = userRating ? String(userRating.score) : "0";

        if (hateFollowButton) {
            if (isOwnProfile) {
                hateFollowButton.classList.add("hidden");
            } else {
                hateFollowButton.classList.remove("hidden");
                hateFollowButton.textContent = profile.is_hated_by_current_user
                    ? "Remove hate-follow"
                    : "Hate-follow";
            }
        }

        state.posts = [];
        for (const post of posts) {
            state.posts.push({
                ...post,
                my_reaction: "",
            });
        }

        await loadReactionSelections(state.posts);
        renderFeed(state.posts, "user-posts-list");
        renderAchievements(achievements);
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function loadPostPage() {
    await loadCurrentUser();
    await loadSavedPostIds();

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

async function loadMoreFeedPosts() {
    const button = element("load-more-button");
    if (button) {
        button.disabled = true;
        button.textContent = "Loading...";
    }

    try {
        await loadFeedPosts({ append: true });
    } catch (error) {
        showMessage(error.message, true);
        updateLoadMoreButton();
    }
}

async function loadEditPostPage() {
    if (!requireAuth()) {
        return;
    }

    await loadCurrentUser();
    await loadSavedPostIds();

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
        refreshEditPostImagePreview();
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function reloadCurrentPage() {
    if (pageName() === "profile") {
        await loadProfilePage();
        return;
    }

    if (pageName() === "saved") {
        await loadSavedPage();
        return;
    }

    if (pageName() === "activity") {
        await loadActivityPage();
        return;
    }

    if (pageName() === "user") {
        await loadUserPage();
        return;
    }

    if (pageName() === "post") {
        await loadPostPage();
        return;
    }

    await loadFeedPosts({
        customLimit: Math.max(state.posts.length, state.feedPageSize),
    });
}
