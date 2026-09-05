import { createCostIsolatedStrategyConfigParser } from "@tradejs/strategy-kit/config";
import type { ValidatedStrategyRegistryEntry } from "@tradejs/strategy-kit/config";
import { BatConfig, config as DEFAULT_CONFIG } from "./config";
import { createBatCore } from "./core";
import { batManifest } from "./manifest";

export const BatStrategyDefinition: ValidatedStrategyRegistryEntry<BatConfig> =
  {
    defaults: DEFAULT_CONFIG,
    parseConfig: createCostIsolatedStrategyConfigParser({
      strategyName: "Bat",
      defaults: DEFAULT_CONFIG,
    }),
    createCore: createBatCore,
    manifest: batManifest,
  };
