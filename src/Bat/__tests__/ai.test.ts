import { batAiAdapter } from "../adapters/ai";

describe("batAiAdapter", () => {
  it("carries Bat geometry into the AI payload and prompt", () => {
    const context = {
      patternKind: "bullish_bat",
      signalDirection: "LONG",
      xbRetracement: 0.5,
      acRetracement: 0.8,
      bdExtension: 1.965,
      xdRetracement: 0.886,
      pivots: [{ role: "X", value: 100 }],
    };
    const payload = batAiAdapter.buildPayload!({
      signal: { additionalIndicators: { batContext: context } },
      basePayload: {
        additionalIndicators: { baseContext: { available: true } },
      },
    } as any);

    expect((payload.additionalIndicators as any).batContext).toEqual(context);
    expect((payload.additionalIndicators as any).baseContext).toEqual({
      available: true,
    });

    const prompt = batAiAdapter.buildHumanPromptAddon!({ payload } as any);
    expect(prompt).toContain("patternKind=bullish_bat");
    expect(prompt).toContain("xbRetracement=0.5");
    expect(prompt).toContain("xdRetracement=0.886");
    expect(prompt).toContain("|AD|/|XA|");
  });
});
