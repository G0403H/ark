import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { useBackgroundDownloader } from "./background-downloader.ts";

describe("Background Model Downloader", () => {
  test("initializes with empty downloads state", () => {
    const state = useBackgroundDownloader.getState();
    assert.deepEqual(state.downloads, {});
    assert.equal(state.activeModelId, null);
  });

  test("can clear download status", () => {
    useBackgroundDownloader.setState({
      downloads: {
        "test-model": {
          status: "ready",
          progress: 100,
          text: "Loaded",
        },
      },
      activeModelId: "test-model",
    });

    useBackgroundDownloader.getState().clearDownloadStatus("test-model");
    const state = useBackgroundDownloader.getState();
    assert.equal(state.downloads["test-model"], undefined);
    assert.equal(state.activeModelId, null);
  });
});
