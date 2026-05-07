import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const mojibakeFragments = ["\u7e67", "\u90e2", "\u9aeb", "\ufffd"];

test("markdown files do not contain common mojibake fragments", async () => {
  const files = await collectMarkdownFiles(root);
  const failures = [];

  for (const file of files) {
    const text = await readFile(file, "utf8");
    const lines = text.split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      if (isIntentionalMojibakeReference(line)) {
        continue;
      }
      for (const fragment of mojibakeFragments) {
        if (line.includes(fragment)) {
          failures.push(`${file}:${index + 1}: ${fragment}`);
        }
      }
    }
  }

  assert.deepEqual(failures, []);
});

async function collectMarkdownFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory)) {
    const fullPath = join(directory, entry);
    const entryStat = await stat(fullPath);
    if (entryStat.isDirectory() && ![".git", "node_modules"].includes(entry)) {
      files.push(...await collectMarkdownFiles(fullPath));
    } else if (entryStat.isFile() && entry.toLowerCase().endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

function isIntentionalMojibakeReference(line) {
  return (
    line.includes("文字化け") ||
    line.includes("mojibake") ||
    line.includes("断片") ||
    mojibakeFragments.every((fragment) => line.includes(fragment))
  );
}
