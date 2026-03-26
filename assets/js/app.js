const siteBaseUrl = (() => {
  const pathname = window.location.pathname;
  const isFilePath = /\/[^/]+\.[^/]+$/.test(pathname);
  const normalizedPath = isFilePath
    ? pathname.replace(/[^/]+$/, '')
    : pathname.endsWith('/') ? pathname : `${pathname}/`;

  return new URL(normalizedPath || '/', window.location.origin);
})();
const manifestUrl = new URL('content/manifest.json', siteBaseUrl).toString();
const summaryCards = document.getElementById('summaryCards');
const statusText = document.getElementById("statusText");
const searchInput = document.getElementById("searchInput");
const breadcrumbs = document.getElementById("breadcrumbs");
const browserGrid = document.getElementById("browserGrid");
const viewerPanel = document.getElementById("viewerPanel");
const viewerTitle = document.getElementById("viewerTitle");
const viewerMeta = document.getElementById("viewerMeta");
const viewerFrame = document.getElementById("viewerFrame");
const closeViewer = document.getElementById("closeViewer");

let libraryRoot = null;
let currentPath = [];

function resolveLocalUrl(path) {
  return new URL(path, siteBaseUrl).toString();
}

function prettifySegment(value) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildTree(items) {
  const root = {
    id: "",
    name: "Library",
    pathSegments: [],
    children: [],
    entries: []
  };

  const map = new Map([["", root]]);

  function getNode(pathSegments) {
    const key = pathSegments.join("/");

    if (!map.has(key)) {
      const node = {
        id: key,
        name: prettifySegment(pathSegments[pathSegments.length - 1]),
        pathSegments: [...pathSegments],
        children: [],
        entries: []
      };

      map.set(key, node);
      const parent = getNode(pathSegments.slice(0, -1));
      parent.children.push(node);
    }

    return map.get(key);
  }

  items.forEach((item) => {
    const segments = item.segments.length ? item.segments : ["uncategorized"];
    const targetNode = getNode(segments);
    targetNode.entries.push(item);
  });

  const sortNode = (node) => {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
    node.entries.sort((a, b) => a.title.localeCompare(b.title));
    node.children.forEach(sortNode);
    return node;
  };

  return sortNode(root);
}

function countEntries(node) {
  return node.entries.length + node.children.reduce((sum, child) => sum + countEntries(child), 0);
}

function getNodeByPath(pathSegments) {
  let currentNode = libraryRoot;

  for (const segment of pathSegments) {
    const nextNode = currentNode.children.find((child) => child.pathSegments[child.pathSegments.length - 1] === segment);

    if (!nextNode) {
      return libraryRoot;
    }

    currentNode = nextNode;
  }

  return currentNode;
}

function navigateTo(pathSegments) {
  currentPath = [...pathSegments];
  searchInput.value = "";
  hideViewer();
  renderFolderView();
}

function hideViewer() {
  viewerFrame.src = "about:blank";
  viewerPanel.hidden = true;
}

function showLocalPreview(entry) {
  viewerTitle.textContent = entry.title;
  viewerMeta.textContent = entry.displayPath || entry.path;
  viewerFrame.src = resolveLocalUrl(entry.path);
  viewerPanel.hidden = false;
  viewerPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderSummary() {
  summaryCards.innerHTML = "";

  if (!libraryRoot || !libraryRoot.children.length) {
    return;
  }

  libraryRoot.children.forEach((node) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "summary-card summary-card--button";
    card.innerHTML = `
      <span class="eyebrow">${node.name}</span>
      <strong class="summary-card__count">${countEntries(node)}</strong>
      <span>${countEntries(node) === 1 ? "library item" : "library items"}</span>
    `;
    card.addEventListener("click", () => navigateTo(node.pathSegments));
    summaryCards.appendChild(card);
  });
}

function renderBreadcrumbs() {
  breadcrumbs.innerHTML = "";

  const rootButton = document.createElement("button");
  rootButton.type = "button";
  rootButton.className = `crumb ${currentPath.length ? "" : "crumb--current"}`.trim();
  rootButton.textContent = "Library";
  rootButton.addEventListener("click", () => navigateTo([]));
  breadcrumbs.appendChild(rootButton);

  currentPath.forEach((segment, index) => {
    const divider = document.createElement("span");
    divider.className = "crumb-separator";
    divider.textContent = "/";
    breadcrumbs.appendChild(divider);

    const crumb = document.createElement("button");
    crumb.type = "button";
    crumb.className = `crumb ${index === currentPath.length - 1 ? "crumb--current" : ""}`.trim();
    crumb.textContent = prettifySegment(segment);
    crumb.addEventListener("click", () => navigateTo(currentPath.slice(0, index + 1)));
    breadcrumbs.appendChild(crumb);
  });
}

function getVisibleContent(node, query) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return {
      folders: node.children,
      entries: node.entries
    };
  }

  return {
    folders: node.children.filter((child) => {
      const text = `${child.name} ${child.pathSegments.join(" ")}`.toLowerCase();
      return text.includes(normalizedQuery);
    }),
    entries: node.entries.filter((entry) => {
      const text = `${entry.title} ${entry.path} ${entry.displayPath || ""}`.toLowerCase();
      return text.includes(normalizedQuery);
    })
  };
}

function createFolderCard(node, isBackCard = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `browser-card folder-card ${isBackCard ? "folder-card--back" : ""}`.trim();
  const totalItems = countEntries(node);

  button.innerHTML = `
    <span class="browser-card__eyebrow">${isBackCard ? "Go Back" : "Folder"}</span>
    <strong class="browser-card__title">${isBackCard ? `.. ${node.name}` : node.name}</strong>
    <span class="browser-card__meta">${node.children.length} subfolder${node.children.length === 1 ? "" : "s"} · ${totalItems} item${totalItems === 1 ? "" : "s"}</span>
  `;

  button.addEventListener("click", () => navigateTo(node.pathSegments));
  return button;
}

function createEntryCard(entry) {
  const element = entry.kind === "external"
    ? document.createElement("a")
    : document.createElement("button");

  if (entry.kind === "external") {
    element.href = entry.path;
    element.target = "_blank";
    element.rel = "noopener noreferrer";
  } else {
    element.type = "button";
    element.addEventListener("click", () => showLocalPreview(entry));
  }

  element.className = `browser-card item-card item-card--${entry.kind}`;
  element.innerHTML = `
    <span class="browser-card__eyebrow">${entry.kind === "external" ? "External Link" : "Local HTML"}</span>
    <strong class="browser-card__title">${entry.title}</strong>
    <span class="browser-card__meta">${entry.displayPath || entry.path}</span>
  `;

  return element;
}

function renderFolderView() {
  const node = getNodeByPath(currentPath);
  const { folders, entries } = getVisibleContent(node, searchInput.value);
  const folderLabel = currentPath.length ? prettifySegment(currentPath[currentPath.length - 1]) : "Library";
  const visibleCount = folders.length + entries.length;

  renderBreadcrumbs();
  browserGrid.innerHTML = "";

  if (currentPath.length) {
    const parentNode = getNodeByPath(currentPath.slice(0, -1));
    browserGrid.appendChild(createFolderCard(parentNode, true));
  }

  folders.forEach((folder) => {
    browserGrid.appendChild(createFolderCard(folder));
  });

  entries.forEach((entry) => {
    browserGrid.appendChild(createEntryCard(entry));
  });

  if (!visibleCount && !currentPath.length) {
    browserGrid.innerHTML = `
      <div class="empty-state">
        No learning items found yet. Add HTML files or <code>.link.json</code> files under <code>content/</code>.
      </div>
    `;
  } else if (!visibleCount) {
    browserGrid.innerHTML += `
      <div class="empty-state">
        This folder has no visible items for the current search.
      </div>
    `;
  }

  statusText.textContent = searchInput.value.trim()
    ? `Showing ${visibleCount} result${visibleCount === 1 ? "" : "s"} in ${folderLabel}.`
    : `${folders.length} folder${folders.length === 1 ? "" : "s"} and ${entries.length} item${entries.length === 1 ? "" : "s"} in ${folderLabel}.`;
}

async function loadManifest() {
  try {
    const response = await fetch(manifestUrl, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Unable to load manifest: ${response.status}`);
    }

    const manifest = await response.json();
    libraryRoot = buildTree(manifest.items || []);

    renderSummary();
    renderFolderView();
  } catch (error) {
    statusText.textContent = "The content manifest could not be loaded yet.";
    browserGrid.innerHTML = `
      <div class="empty-state">
        Run <code>powershell -File scripts/generate-manifest.ps1</code> to create <code>content/manifest.json</code>.
      </div>
    `;
    console.error(error);
  }
}

searchInput.addEventListener("input", renderFolderView);
closeViewer.addEventListener("click", hideViewer);
loadManifest();

