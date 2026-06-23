const appScripts = [
    "/static/js/app/00-core.js?v=22",
    "/static/js/app/10-ui.js?v=22",
    "/static/js/app/20-api.js?v=22",
    "/static/js/app/30-render.js?v=22",
    "/static/js/app/40-pages.js?v=22",
    "/static/js/app/50-actions.js?v=22",
    "/static/js/app/60-init.js?v=22",
];

function loadAppScript(index) {
    if (index >= appScripts.length) {
        return;
    }

    const script = document.createElement("script");
    script.src = appScripts[index];
    script.onload = function () {
        loadAppScript(index + 1);
    };
    document.body.appendChild(script);
}

loadAppScript(0);
