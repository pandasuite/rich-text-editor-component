import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Node's native ESM loader requires explicit file extensions.
// eslint-disable-next-line import/extensions
import stripQuillDocumentTerminator from "../src/plainText.mjs";

test("removes only Quill's structural final newline", () => {
  assert.equal(stripQuillDocumentTerminator("Psalm 145\n"), "Psalm 145");
  assert.equal(stripQuillDocumentTerminator("\n"), "");
  assert.equal(
    stripQuillDocumentTerminator("first\nsecond\n"),
    "first\nsecond",
  );
});

test("preserves authored trailing whitespace", () => {
  assert.equal(stripQuillDocumentTerminator("text \n"), "text ");
  assert.equal(stripQuillDocumentTerminator("text\n\n"), "text\n");
  assert.equal(stripQuillDocumentTerminator("text"), "text");
});

test("manifest examples match the public plain-text contract", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../public/pandasuite.json", import.meta.url), "utf8"),
  );

  assert.equal(manifest.queryable.text, "");
  manifest.events.forEach((event) => {
    if (event.queryable?.text !== undefined) {
      assert.equal(event.queryable.text, "", event.id);
    }
  });
});
