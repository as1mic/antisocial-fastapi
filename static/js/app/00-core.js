const state = {
    token: localStorage.getItem("antisocial_token") || "",
    currentUser: null,
    posts: [],
    savedPostIds: [],
    commentsByPost: {},
    openModalPostId: null,
    feedPageSize: 6,
    feedHasMore: false,
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

function userPageUrl(userId) {
    return `/user/${userId}`;
}

function editPostPageUrl(postId) {
    return `/post/${postId}/edit`;
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

function currentUserIdFromUrl() {
    const parts = window.location.pathname.split("/").filter(Boolean);

    for (let index = parts.length - 1; index >= 0; index -= 1) {
        const value = Number(parts[index]);
        if (Number.isInteger(value) && value > 0) {
            return value;
        }
    }

    return 0;
}
