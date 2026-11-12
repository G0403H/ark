import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { prefixRewrite, previewPathPrefix } from "./preview-path-prefix.ts";

const PORT = "/hds-up68yqz8egcm-6014-7b575";

describe("previewPathPrefix", () => {
  it("reads the port id segment on path-based preview hosts", () => {
    assert.equal(previewPathPrefix("preview.internal.com", `${PORT}/`), PORT);
    assert.equal(previewPathPrefix("Preview.Internal.mil", `${PORT}/about`), PORT);
    assert.equal(previewPathPrefix("preview.internal.mil", PORT), PORT);
  });

  it("ignores other hosts and paths without a port id", () => {
    assert.equal(previewPathPrefix("abc.sandbox.local", `${PORT}/`), undefined);
    assert.equal(previewPathPrefix("localhost", `${PORT}/`), undefined);
    assert.equal(previewPathPrefix("preview.internal.com", "/about"), undefined);
    assert.equal(previewPathPrefix("preview.internal.com", "/hds-abc-web-x1/"), undefined);
    assert.equal(previewPathPrefix("preview.internal.com", `${PORT}.js`), undefined);
  });
});

describe("prefixRewrite", () => {
  const rewrite = prefixRewrite(PORT);
  const run = (fn: typeof rewrite.input, href: string) =>
    String(fn?.({ url: new URL(href, "https://preview.internal.com") }));

  it("strips the prefix on input", () => {
    assert.equal(run(rewrite.input, PORT), "https://preview.internal.com/");
    assert.equal(run(rewrite.input, `${PORT}/a?b=1#c`), "https://preview.internal.com/a?b=1#c");
    assert.equal(run(rewrite.input, "/other"), "https://preview.internal.com/other");
  });

  it("adds the prefix on output", () => {
    assert.equal(run(rewrite.output, "/a?b=1"), `https://preview.internal.com${PORT}/a?b=1`);
    assert.equal(run(rewrite.output, "/"), `https://preview.internal.com${PORT}/`);
  });
});
