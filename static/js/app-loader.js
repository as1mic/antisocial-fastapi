const appVersion = "24";

const appScripts = [
    `/static/js/app/core.js?v=${appVersion}`,
    `/static/js/app/ui.js?v=${appVersion}`,
    `/static/js/app/api.js?v=${appVersion}`,
    `/static/js/app/render.js?v=${appVersion}`,
    `/static/js/app/pages.js?v=${appVersion}`,
    `/static/js/app/actions.js?v=${appVersion}`,
    `/static/js/app/init.js?v=${appVersion}`,
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
