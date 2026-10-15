// Only these static paths are inserted as markup.
export const iconPaths = {
    book: ['M12 7v14', 'M3 4h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5v16h-5a4 4 0 0 0-4 1 4 4 0 0 0-4-1H3z'],
    arrow: ['M5 12h14m-5-5 5 5-5 5'],
    selection: ['M8 3H4v4m12-4h4v4M4 17v4h4m12-4v4h-4M8 8h8M8 12h8M8 16h5'],
    clipboard: ['M9 5H5v16h14V5h-4', 'M9 3h6v4H9z'],
    upload: ['M12 15V3m-4 4 4-4 4 4M4 15v6h16v-6'],
    inbox: ['m4 4-2 10v6h20v-6L20 4z', 'M2 14h6l2 3h4l2-3h6'],
    clock: ['M12 8v5l3 2', 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0'],
    refresh: ['M20 7v5h-5M4 17v-5h5', 'M5 8a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3'],
    chevron: ['m9 5 7 7-7 7'],
    close: ['m6 6 12 12M6 18 18 6'],
    copy: ['M9 9h12v12H9z', 'M15 5V2H2v13h3'],
    download: ['M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5'],
    source: ['m8 6-6 6 6 6m8-12 6 6-6 6m-3-16-2 20'],
    moon: ['M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10'],
    sun: ['M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5'],
    trash: ['M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7'],
    panel: ['M3 3h18v18H3zM9 3v18'],
    search: ['M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0m-2 5 6 6'],
    external: ['M14 3h7v7m0-7L11 13M10 3H3v18h18v-7'],
    check: ['m5 12 4 4L19 6'],
    file: ['M14 2H4v20h16V8zM14 2v6h6M8 13h8m-8 4h6'],
};
export function iconMarkup(name) {
    return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(iconPaths[name] || []).map(d => `<path d="${d}"/>`).join('')}</svg>`;
}
export function hydrateIcons(root = document) {
    root.querySelectorAll('[data-icon]').forEach(element => { element.innerHTML = iconMarkup(element.dataset.icon); });
}
