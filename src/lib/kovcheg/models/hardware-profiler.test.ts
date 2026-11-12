import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  estimateModelVRAM,
  profileDeviceHardware,
  evaluateModelCompatibility,
} from "./hardware-profiler.ts";
import type { DeviceHardwareProfile } from "./types.ts";

describe("Hardware Profiler & AI Capability Thresholds", () => {
  test("accurately calculates VRAM and disk footprint for models", () => {
    // 0.3B Q8
    const mnn03b = estimateModelVRAM(0.3, "q8");
    assert.ok(mnn03b.estimatedVramMb > 300 && mnn03b.estimatedVramMb < 600);
    assert.ok(mnn03b.sizeLabel.includes("МБ"));

    // 0.5B Q4
    const qwen05 = estimateModelVRAM(0.5, "q4");
    assert.ok(qwen05.estimatedVramMb > 400 && qwen05.estimatedVramMb < 700);

    // 7.0B Q4
    const llama7b = estimateModelVRAM(7.0, "q4");
    assert.ok(llama7b.estimatedVramMb > 4000);
    assert.ok(llama7b.sizeLabel.includes("ГБ"));

    // 7.0B FP16 (uncompressed)
    const llama7bF16 = estimateModelVRAM(7.0, "f16");
    assert.ok(llama7bF16.estimatedVramMb > 14000);
  });

  test("returns valid hardware profile in non-browser / test environment", async () => {
    const profile = await profileDeviceHardware();
    assert.ok(typeof profile.hasWebGPU === "boolean");
    assert.ok(profile.safeVramBudgetMb >= 0);
    assert.ok(profile.deviceMemoryGb > 0);
    assert.ok(profile.tierDescription.length > 0);
  });

  test("evaluates model compatibility tiers correctly", () => {
    const lowPhoneProfile: DeviceHardwareProfile = {
      hasWebGPU: true,
      adapterName: "Adreno 610 (Mobile)",
      isMobile: true,
      deviceMemoryGb: 4,
      hardwareConcurrency: 8,
      storageEstimateMb: 12000,
      maxBufferSizeMb: 512,
      safeVramBudgetMb: 800,
      maxSafeParamsB: 0.5,
      tier: "low",
      tierDescription: "Базовый смартфон: оптимально до 0.5B",
    };

    // 0.3B model should be SAFE on 800MB budget
    const safeResult = evaluateModelCompatibility(
      { parametersB: 0.3, quantization: "q8" },
      lowPhoneProfile
    );
    assert.equal(safeResult.status, "safe");
    assert.ok(safeResult.label.includes("Совместима"));
    assert.ok(safeResult.percentOfBudget <= 85);

    // 1.0B model (~900MB) should be WARNING on 800MB budget
    const warnResult = evaluateModelCompatibility(
      { parametersB: 1.0, quantization: "q4" },
      lowPhoneProfile
    );
    assert.equal(warnResult.status, "warning");
    assert.ok(warnResult.label.includes("На грани"));

    // 7.0B model (~4600MB) should be DANGER on 800MB phone
    const dangerResult = evaluateModelCompatibility(
      { parametersB: 7.0, quantization: "q4" },
      lowPhoneProfile
    );
    assert.equal(dangerResult.status, "danger");
    assert.ok(dangerResult.label.includes("Превышает порог"));
    assert.ok(dangerResult.percentOfBudget > 200);
    assert.ok(dangerResult.detail.includes("Out-Of-Memory"));
  });

  test("marks local-endpoint models as safe without consuming browser VRAM", () => {
    const phoneProfile: DeviceHardwareProfile = {
      hasWebGPU: false,
      adapterName: "No GPU",
      isMobile: true,
      deviceMemoryGb: 2,
      hardwareConcurrency: 4,
      storageEstimateMb: 2000,
      maxBufferSizeMb: 0,
      safeVramBudgetMb: 0,
      maxSafeParamsB: 0,
      tier: "unsupported",
      tierDescription: "Без WebGPU",
    };

    const endpointResult = evaluateModelCompatibility(
      {
        parametersB: 7.0,
        quantization: "q4",
        customConfig: {
          id: "custom-ollama",
          name: "Ollama Termux 7B",
          family: "Llama",
          parametersB: 7.0,
          quantization: "q4",
          sourceType: "local-endpoint",
          endpointUrl: "http://127.0.0.1:11434/v1",
          sizeLabel: "Внешний",
          vramLabel: "Сервер",
          description: "Test endpoint",
          createdAt: Date.now(),
        },
      },
      phoneProfile
    );

    assert.equal(endpointResult.status, "safe");
    assert.ok(endpointResult.label.includes("Локальный сервер"));
    assert.equal(endpointResult.estimatedVramMb, 0);
  });
});
