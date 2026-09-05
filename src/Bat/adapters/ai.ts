import { mapAiRuntimeFromConfig } from "@tradejs/core/strategies";
import type { StrategyAiAdapter } from "@tradejs/types";
import type { BatConfig } from "../config";

export const batAiAdapter: StrategyAiAdapter = {
  buildPayload: ({ signal, basePayload }) => {
    const baseAdditional =
      (basePayload.additionalIndicators as
        Record<string, unknown> | undefined) ?? {};

    return {
      ...basePayload,
      additionalIndicators: {
        ...baseAdditional,
        batContext: (
          signal.additionalIndicators as Record<string, unknown> | undefined
        )?.batContext,
      },
    };
  },
  buildHumanPromptAddon: ({ payload }) => {
    const additional =
      (payload.additionalIndicators as Record<string, unknown> | undefined) ??
      {};
    const context =
      (additional.batContext as Record<string, unknown> | undefined) ?? {};

    return `
Additional Bat context:
- patternKind=${String(context.patternKind ?? "n/a")}
- signalDirection=${String(context.signalDirection ?? "n/a")}
- entryStage=${String(context.entryStage ?? "n/a")}
- xbRetracement=${String(context.xbRetracement ?? "n/a")}
- acRetracement=${String(context.acRetracement ?? "n/a")}
- bdExtension=${String(context.bdExtension ?? "n/a")}
- xdRetracement=${String(context.xdRetracement ?? "n/a")}
- xdDeviation=${String(context.xdDeviation ?? "n/a")}
- entryDistanceAtr=${String(context.entryDistanceAtr ?? "n/a")}
- targetPrice=${String(context.targetPrice ?? "n/a")}
- stopLossPrice=${String(context.stopLossPrice ?? "n/a")}
- pivots=${JSON.stringify(context.pivots ?? [])}

Interpretation rules for Bat:
- A bullish Bat is X low, A high, B low, C high, D low and enters long after D is confirmed.
- A bearish Bat is the exact mirror image and enters short after D is confirmed.
- xbRetracement is |AB|/|XA|, acRetracement is |BC|/|AB|, bdExtension is |CD|/|BC|, and xdRetracement is |AD|/|XA|.
- The 0.886 XD retracement is the primary completion condition. The other ratios validate the two wings, not independent entry signals.
- Reject analysis that contradicts the signal direction or assumes that an unconfirmed D pivot was known earlier.
`.trim();
  },
  mapEntryRuntimeFromConfig: (config) =>
    mapAiRuntimeFromConfig(
      config as Pick<BatConfig, "AI_ENABLED" | "AI_MODE" | "MIN_AI_QUALITY">,
    ),
};
