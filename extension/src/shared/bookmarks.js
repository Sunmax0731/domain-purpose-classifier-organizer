export function getDomain(url) {
  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

export function getSearchText(bookmark) {
  const url = bookmark.url || "";
  const domain = bookmark.domain || getDomain(url);
  return `${bookmark.title || ""} ${url} ${domain}`.toLowerCase();
}

export function flattenBookmarkTree(nodes) {
  const items = [];
  const roots = Array.isArray(nodes) ? nodes : [nodes];

  for (const node of roots) {
    visitNode(node, [], items);
  }

  return items;
}

function visitNode(node, parentPath, items) {
  if (!node) {
    return;
  }

  if (node.url) {
    items.push({
      id: String(node.id),
      title: node.title || node.url,
      url: node.url,
      parentId: node.parentId == null ? null : String(node.parentId),
      index: Number.isInteger(node.index) ? node.index : null,
      path: parentPath.filter(Boolean),
      domain: getDomain(node.url)
    });
    return;
  }

  const folderTitle = node.title || "";
  const nextPath = folderTitle ? [...parentPath, folderTitle] : parentPath;
  for (const child of node.children || []) {
    visitNode(child, nextPath, items);
  }
}

export function createBookmarkSnapshot(bookmarks) {
  return bookmarks
    .filter((bookmark) => bookmark && bookmark.url)
    .map((bookmark) => ({
      id: String(bookmark.id),
      title: bookmark.title || bookmark.url,
      url: bookmark.url,
      parentId: bookmark.parentId == null ? null : String(bookmark.parentId),
      index: Number.isInteger(bookmark.index) ? bookmark.index : null,
      path: Array.isArray(bookmark.path) ? [...bookmark.path] : []
    }));
}
