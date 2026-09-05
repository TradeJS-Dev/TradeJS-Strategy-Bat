import { BatPattern } from "../engine";
import { buildBatFigures } from "../figures";

describe("Bat figures", () => {
  it("renders XABCD, XD, target, stop, pivots and entry", () => {
    const pattern: BatPattern = {
      setupId: "bullish-bat-1",
      kind: "bullish_bat",
      direction: "LONG",
      entryStage: "d_confirmed",
      pivots: [
        { timestamp: 1, index: 0, value: 100, kind: "low", traded: false },
        { timestamp: 2, index: 1, value: 200, kind: "high", traded: false },
        { timestamp: 3, index: 2, value: 150, kind: "low", traded: false },
        { timestamp: 4, index: 3, value: 190, kind: "high", traded: false },
        { timestamp: 5, index: 4, value: 111.4, kind: "low", traded: true },
      ],
      targetPrice: 145.2452,
      stopLossPrice: 97,
      xaHeight: 100,
      patternHeightAtr: 4,
      patternAgeBars: 5,
      dConfirmationBars: 1,
      xToABars: 1,
      aToBBars: 1,
      bToCBars: 1,
      cToDBars: 1,
      xbRetracement: 0.5,
      acRetracement: 0.8,
      bdExtension: 1.965,
      xdRetracement: 0.886,
      xdDeviation: 0,
      entryDistanceAtr: 0.5,
      timestamp: 6,
      close: 125,
    };

    const figures = buildBatFigures({
      pattern,
      entryTimestamp: 6,
      entryPrice: 125,
    });

    expect(figures.lines).toHaveLength(4);
    expect(figures.points).toHaveLength(2);
    expect(figures.lines?.map((line) => line.kind)).toEqual([
      "bat_bullish_bat_xabcd",
      "bat_xd_retracement",
      "bat_target",
      "bat_stop",
    ]);
    expect(figures.lines?.[0]?.points).toHaveLength(5);
    expect(figures.points?.[0]?.points).toHaveLength(5);
  });
});
