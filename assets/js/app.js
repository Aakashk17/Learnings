const manifestUrl = "content/manifest.json";
const treeRoot = document.getElementById("treeRoot");
const summaryCards = document.getElementById("summaryCards");
const statusText = document.getElementById("statusText");
const searchInput = document.getElementById("searchInput");
const nodeTemplate = document.getElementById("nodeTemplate");
const leafTemplate = document.getElementById("leafTemplate");

let fullTree = [];

function prettifySegment(value) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildTree(items) {
  const root = [];
  const map = new Map();

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

      if (pathSegments.length === 1) {
        root.push(node);
      } else {
        const parent = getNode(pathSegments.slice(0, -1));
        parent.children.push(node);
      }
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

  return root.sort((a, b) => a.name.localeCompare(b.name)).map(sortNode);
}

function countEntries(node) {
  return node.entries.length + node.children.reduce((sum, child) => sum + countEntries(child), 0);
}

function renderSummary(tree) {
  summaryCards.innerHTML = "";

  if (!tree.length) {
    return;
  }

  tree.forEach((node) => {
    const card = document.createElement("article");
    card.className = "summary-card";
    card.innerHTML = `
      <span class="eyebrow">${node.name}</span>
      <strong class="summary-card__count">${countEntries(node)}</strong>
      <span>${countEntries(node) === 1 ? "learning file" : "learning files"}</span>
    `;
    summaryCards.appendChild(card);
  });
}

function renderTree(nodes, container) {
  container.innerHTML = "";

  if (!nodes.length) {
    container.innerHTML = `
      <div class="empty-state">
        No learning files matched this search. Add HTML files under <code>content/</code> or change the filter.
      </div>
    `;
    return;
  }

  nodes.forEach((node) => {
    const fragment = nodeTemplate.content.cloneNode(true);
    const nodeEl = fragment.querySelector(".node");
    const toggle = fragment.querySelector(".node__toggle");
    const name = fragment.querySelector(".node__name");
    const meta = fragment.querySelector(".node__meta");
    const children = fragment.querySelector(".node__children");
    const childNodeContainer = document.createElement("div");
    childNodeContainer.className = "node__children";

    name.textContent = node.name;
    const totalCount = countEntries(node);
    meta.textContent = `${totalCount} file${totalCount === 1 ? "" : "s"}`;

    toggle.addEventListener("click", () => {
      const collapsed = nodeEl.classList.toggle("node--collapsed");
      toggle.setAttribute("aria-expanded", String(!collapsed));
    });

    node.entries.forEach((entry) => {
      const leafFragment = leafTemplate.content.cloneNode(true);
      const leaf = leafFragment.querySelector(".leaf");
      const title = leafFragment.querySelector(".leaf__title");
      const path = leafFragment.querySelector(".leaf__path");

      leaf.href = entry.path;
      title.textContent = entry.title;
      path.textContent = entry.path;
      children.appendChild(leafFragment);
    });

    if (node.children.length) {
      renderTree(node.children, childNodeContainer);
      children.appendChild(childNodeContainer);
    }
    container.appendChild(fragment);
  });
}

function filterTree(nodes, query) {
  if (!query) {
    return nodes;
  }

  return nodes.reduce((result, node) => {
    const matchingEntries = node.entries.filter((entry) => {
      const searchText = `${entry.title} ${entry.path} ${entry.segments.join(" ")}`.toLowerCase();
      return searchText.includes(query);
    });

    const matchingChildren = filterTree(node.children, query);
    const nodeMatch = node.name.toLowerCase().includes(query);

    if (nodeMatch || matchingEntries.length || matchingChildren.length) {
      result.push({
        ...node,
        entries: nodeMatch ? node.entries : matchingEntries,
        children: matchingChildren
      });
    }

    return result;
  }, []);
}

function updateView() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = filterTree(fullTree, query);
  renderSummary(filtered);
  renderTree(filtered, treeRoot);
  statusText.textContent = query
    ? `Showing ${filtered.length} top-level matches for "${searchInput.value.trim()}".`
    : "Browse your learning files by topic and folder.";
}

async function loadManifest() {
  try {
    const response = await fetch(manifestUrl, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Unable to load manifest: ${response.status}`);
    }

    const manifest = await response.json();
    fullTree = buildTree(manifest.items || []);
    const totalFiles = (manifest.items || []).length;

    statusText.textContent = totalFiles
      ? `${totalFiles} learning file${totalFiles === 1 ? "" : "s"} indexed.`
      : "No HTML learning files found yet.";

    renderSummary(fullTree);
    renderTree(fullTree, treeRoot);
  } catch (error) {
    statusText.textContent = "The content manifest could not be loaded yet.";
    treeRoot.innerHTML = `
      <div class="empty-state">
        Run <code>powershell -File scripts/generate-manifest.ps1</code> to create <code>content/manifest.json</code>.
      </div>
    `;
    console.error(error);
  }
}

searchInput.addEventListener("input", updateView);
loadManifest();


