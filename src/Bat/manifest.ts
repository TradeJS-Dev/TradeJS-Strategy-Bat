import { StrategyManifest } from "@tradejs/types";
import { batAiAdapter } from "./adapters/ai";

export const batManifest: StrategyManifest = {
  name: "Bat",
  aiAdapter: batAiAdapter,
};
