/** @jest-environment node */

import { config as DEFAULT_CONFIG } from "../config";
import { createBatEngine } from "../engine";
import {
  makeBullishBatCandles,
  makeCandle,
  mirrorBatCandles,
} from "./fixtures";

const makeConfig = (overrides: Record<string, unknown> = {}) =>
  ({
    ...DEFAULT_CONFIG,
    BAT_PIVOT_LENGTH: 1,
    BAT_MIN_PATTERN_HEIGHT_PCT: 0,
    BAT_MIN_PATTERN_HEIGHT_ATR: 0,
    BAT_MAX_ENTRY_DISTANCE_ATR: 10,
    ...overrides,
  }) as any;

describe("Bat engine", () => {
  it("detects a bullish Bat only after D is confirmed", () => {
    const engine = createBatEngine({ config: makeConfig() });
    const states = makeBullishBatCandles().map((candle) =>
      engine.next(candle as any),
    );
    const pattern = states[states.length - 1]?.pattern;

    expect(states.slice(0, -1).every((state) => state.pattern == null)).toBe(
      true,
    );
    expect(pattern?.kind).toBe("bullish_bat");
    expect(pattern?.direction).toBe("LONG");
    expect(pattern?.entryStage).toBe("d_confirmed");
    expect(pattern?.pivots.map((pivot) => pivot.value)).toEqual([
      100, 200, 150, 190, 111.4,
    ]);
    expect(pattern?.xbRetracement).toBeCloseTo(0.5);
    expect(pattern?.acRetracement).toBeCloseTo(0.8);
    expect(pattern?.bdExtension).toBeCloseTo(1.965);
    expect(pattern?.xdRetracement).toBeCloseTo(0.886);
    expect(pattern?.targetPrice).toBeCloseTo(145.2452);
    expect(pattern?.stopLossPrice).toBeCloseTo(97);
  });

  it("detects the mirrored bearish Bat", () => {
    const engine = createBatEngine({ config: makeConfig() });
    const states = mirrorBatCandles(makeBullishBatCandles()).map((candle) =>
      engine.next(candle as any),
    );
    const pattern = states[states.length - 1]?.pattern;

    expect(pattern?.kind).toBe("bearish_bat");
    expect(pattern?.direction).toBe("SHORT");
    expect(pattern?.pivots.map((pivot) => pivot.value)).toEqual([
      200, 100, 150, 110, 188.6,
    ]);
    expect(pattern?.xbRetracement).toBeCloseTo(0.5);
    expect(pattern?.acRetracement).toBeCloseTo(0.8);
    expect(pattern?.bdExtension).toBeCloseTo(1.965);
    expect(pattern?.xdRetracement).toBeCloseTo(0.886);
    expect(pattern?.targetPrice).toBeLessThan(pattern?.close ?? 0);
    expect(pattern?.stopLossPrice).toBeGreaterThan(pattern?.close ?? Infinity);
  });

  it("rejects B outside the configured XB retracement band", () => {
    const candles = makeBullishBatCandles();
    candles[5] = makeCandle(5, 145, 150, 140, 145);
    const engine = createBatEngine({ config: makeConfig() });
    const state = candles.reduce(
      (_, candle) => engine.next(candle as any),
      engine.getState(),
    );

    expect(state.pattern).toBeNull();
  });

  it("rejects C outside the configured AC retracement band", () => {
    const candles = makeBullishBatCandles();
    candles[7] = makeCandle(7, 190, 195, 185, 192);
    const engine = createBatEngine({ config: makeConfig() });
    const state = candles.reduce(
      (_, candle) => engine.next(candle as any),
      engine.getState(),
    );

    expect(state.pattern).toBeNull();
  });

  it("rejects D outside the configured BD extension band", () => {
    const candles = makeBullishBatCandles();
    candles[6] = makeCandle(6, 162, 165, 160, 164);
    candles[7] = makeCandle(7, 168, 173, 165, 170);
    const engine = createBatEngine({ config: makeConfig() });
    const state = candles.reduce(
      (_, candle) => engine.next(candle as any),
      engine.getState(),
    );

    expect(state.pattern).toBeNull();
  });

  it("rejects D outside the 0.886 XD tolerance", () => {
    const candles = makeBullishBatCandles();
    candles[9] = makeCandle(9, 124, 128, 120, 123);
    const engine = createBatEngine({ config: makeConfig() });
    const state = candles.reduce(
      (_, candle) => engine.next(candle as any),
      engine.getState(),
    );

    expect(state.pattern).toBeNull();
  });

  it("emits one setup and is idempotent for a repeated timestamp", () => {
    const engine = createBatEngine({ config: makeConfig() });
    const candles = makeBullishBatCandles();
    const signalCandle = candles[candles.length - 1]!;
    for (const candle of candles.slice(0, -1)) engine.next(candle as any);

    const detected = engine.next(signalCandle as any);
    expect(engine.next(signalCandle as any)).toEqual(detected);
    expect(
      engine.next(makeCandle(11, 126, 132, 121, 128) as any).pattern,
    ).toBeNull();
  });

  it("rebuilds the same confirmed setup from initial candles", () => {
    const config = makeConfig();
    const history = makeBullishBatCandles();
    const signalCandle = history[history.length - 1]!;
    const continuous = createBatEngine({ config });
    for (const candle of history.slice(0, -1)) continuous.next(candle as any);
    const continuousState = continuous.next(signalCandle as any);

    const restored = createBatEngine({
      config,
      initialCandles: history.slice(0, -1) as any,
    });
    expect(restored.next(signalCandle as any)).toEqual(continuousState);
  });
});
