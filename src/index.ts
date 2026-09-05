import { defineStrategyPlugin } from "@tradejs/core/config";
import type { ValidatedStrategyRegistryEntry } from "@tradejs/strategy-kit/config";
import type { StrategyConfig } from "@tradejs/types";
import { config as batDefaultConfig } from "./Bat/config";
import { BatStrategyDefinition } from "./Bat/strategy";

export const strategyEntries: ValidatedStrategyRegistryEntry<any>[] = [
  BatStrategyDefinition,
];

const defaultConfigs: Record<string, StrategyConfig> = {
  Bat: batDefaultConfig,
};

export const getBuiltInStrategyDefaultConfig = (
  strategyName: string,
): StrategyConfig | undefined => defaultConfigs[strategyName];

export { BatStrategyDefinition } from "./Bat/strategy";
export { batDefaultConfig };
export { batManifest } from "./Bat/manifest";
export { batAiAdapter } from "./Bat/adapters/ai";

export default defineStrategyPlugin({ strategyEntries });
