import { Candle, Direction } from "@tradejs/types";
import { BatConfig } from "./config";

export type BatPatternKind = "bullish_bat" | "bearish_bat";
export type BatEntryStage = "d_confirmed";
export type BatPivotRole = "X" | "A" | "B" | "C" | "D";

export interface BatPivot {
  timestamp: number;
  index: number;
  value: number;
  kind: "high" | "low";
  traded: boolean;
}

export interface BatPattern {
  setupId: string;
  kind: BatPatternKind;
  direction: Direction;
  entryStage: BatEntryStage;
  pivots: [BatPivot, BatPivot, BatPivot, BatPivot, BatPivot];
  targetPrice: number;
  stopLossPrice: number;
  xaHeight: number;
  patternHeightAtr: number;
  patternAgeBars: number;
  dConfirmationBars: number;
  xToABars: number;
  aToBBars: number;
  bToCBars: number;
  cToDBars: number;
  xbRetracement: number;
  acRetracement: number;
  bdExtension: number;
  xdRetracement: number;
  xdDeviation: number;
  entryDistanceAtr: number;
  timestamp: number;
  close: number;
}

export interface BatRuntimeState {
  pattern: BatPattern | null;
  pivots: BatPivot[];
}

interface CandleRecord {
  candle: Candle;
  index: number;
}

interface EngineState {
  records: CandleRecord[];
  currentIndex: number;
  pivots: BatPivot[];
  pattern: BatPattern | null;
  consumedSetupIds: string[];
  lastTimestamp: number | null;
}

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const getConfigNumbers = (config: BatConfig) => {
  const minXbRetracement = Math.max(
    0,
    Number(config.BAT_MIN_XB_RETRACEMENT ?? 0.32),
  );
  const minAcRetracement = Math.max(
    0,
    Number(config.BAT_MIN_AC_RETRACEMENT ?? 0.38),
  );
  const minBdExtension = Math.max(
    0,
    Number(config.BAT_MIN_BD_EXTENSION ?? 1.61),
  );

  return {
    pivotLength: Math.max(1, Math.floor(config.BAT_PIVOT_LENGTH ?? 2)),
    minXbRetracement,
    maxXbRetracement: Math.max(
      minXbRetracement,
      Number(config.BAT_MAX_XB_RETRACEMENT ?? 0.5),
    ),
    minAcRetracement,
    maxAcRetracement: Math.max(
      minAcRetracement,
      Number(config.BAT_MAX_AC_RETRACEMENT ?? 0.88),
    ),
    minBdExtension,
    maxBdExtension: Math.max(
      minBdExtension,
      Number(config.BAT_MAX_BD_EXTENSION ?? 2.61),
    ),
    xdRetracement: Math.max(0, Number(config.BAT_XD_RETRACEMENT ?? 0.886)),
    xdRetracementTolerance: Math.max(
      0,
      Number(config.BAT_XD_RETRACEMENT_TOLERANCE ?? 0.03),
    ),
    targetAdRetracement: Math.max(
      0,
      Number(config.BAT_TARGET_AD_RETRACEMENT ?? 0.382),
    ),
    stopXaBuffer: Math.max(0, Number(config.BAT_STOP_XA_BUFFER ?? 0.03)),
    minPatternHeightPct: Math.max(
      0,
      Number(config.BAT_MIN_PATTERN_HEIGHT_PCT ?? 0),
    ),
    minPatternHeightAtr: Math.max(
      0,
      Number(config.BAT_MIN_PATTERN_HEIGHT_ATR ?? 0),
    ),
    atrPeriod: Math.max(2, Math.floor(config.BAT_ATR_PERIOD ?? 14)),
    minLegBars: Math.max(1, Math.floor(config.BAT_MIN_LEG_BARS ?? 1)),
    maxPatternAgeBars: Math.max(
      5,
      Math.floor(config.BAT_MAX_PATTERN_AGE_BARS ?? 220),
    ),
    maxEntryDistanceAtr: Math.max(
      0,
      Number(config.BAT_MAX_ENTRY_DISTANCE_ATR ?? 1.5),
    ),
  };
};

type EngineOptions = ReturnType<typeof getConfigNumbers>;

const calculateAtr = (
  records: CandleRecord[],
  period: number,
): number | null => {
  const relevant = records.slice(-(period + 1));
  if (relevant.length < 2) return null;
  const trueRanges: number[] = [];

  for (let index = 1; index < relevant.length; index += 1) {
    const candle = relevant[index]?.candle;
    const previous = relevant[index - 1]?.candle;
    const high = asNumber(candle?.high);
    const low = asNumber(candle?.low);
    const previousClose = asNumber(previous?.close);
    if (high == null || low == null || previousClose == null) continue;
    trueRanges.push(
      Math.max(
        high - low,
        Math.abs(high - previousClose),
        Math.abs(low - previousClose),
      ),
    );
  }

  if (trueRanges.length === 0) return null;
  return trueRanges.reduce((sum, value) => sum + value, 0) / trueRanges.length;
};

const pushBoundedRecord = (
  state: Pick<EngineState, "records" | "currentIndex">,
  candle: Candle,
  maxRecords: number,
) => {
  state.currentIndex += 1;
  state.records.push({ candle, index: state.currentIndex });
  if (state.records.length > maxRecords) {
    state.records.splice(0, state.records.length - maxRecords);
  }
};

const appendPivot = (state: EngineState, pivot: BatPivot): boolean => {
  const latest = state.pivots[state.pivots.length - 1];
  if (latest?.kind === pivot.kind) {
    if (latest.traded) return false;
    const moreExtreme =
      pivot.kind === "high"
        ? pivot.value > latest.value
        : pivot.value < latest.value;
    if (moreExtreme) {
      state.pivots[state.pivots.length - 1] = pivot;
      return true;
    }
    return false;
  }

  state.pivots.push(pivot);
  if (state.pivots.length > 20) state.pivots.shift();
  return true;
};

const detectConfirmedPivot = (
  state: EngineState,
  pivotLength: number,
): boolean => {
  const windowLength = pivotLength * 2 + 1;
  if (state.records.length < windowLength) return false;

  const centerPosition = state.records.length - pivotLength - 1;
  const start = centerPosition - pivotLength;
  const end = centerPosition + pivotLength + 1;
  if (start < 0) return false;

  const window = state.records.slice(start, end);
  const center = state.records[centerPosition];
  const high = asNumber(center?.candle.high);
  const low = asNumber(center?.candle.low);
  if (!center || high == null || low == null) return false;

  const highs = window.map(({ candle }) => asNumber(candle.high));
  const lows = window.map(({ candle }) => asNumber(candle.low));
  if (
    highs.some((value) => value == null) ||
    lows.some((value) => value == null)
  ) {
    return false;
  }

  const isHigh =
    highs.every((value) => high >= (value as number)) &&
    highs.filter((value) => value === high).length === 1;
  const isLow =
    lows.every((value) => low <= (value as number)) &&
    lows.filter((value) => value === low).length === 1;
  if (isHigh === isLow) return false;

  return appendPivot(state, {
    timestamp: center.candle.timestamp,
    index: center.index,
    value: isHigh ? high : low,
    kind: isHigh ? "high" : "low",
    traded: false,
  });
};

const patternRolesForDirection = (direction: Direction) =>
  direction === "LONG"
    ? (["low", "high", "low", "high", "low"] as const)
    : (["high", "low", "high", "low", "high"] as const);

const findLatestPatternPivots = (
  state: EngineState,
  direction: Direction,
): [BatPivot, BatPivot, BatPivot, BatPivot, BatPivot] | null => {
  const candidate = state.pivots.slice(-5);
  const roles = patternRolesForDirection(direction);
  if (
    candidate.length !== 5 ||
    candidate.some((pivot, index) => pivot.kind !== roles[index]) ||
    candidate[4]!.traded
  ) {
    return null;
  }
  return candidate as [BatPivot, BatPivot, BatPivot, BatPivot, BatPivot];
};

const isWithin = (value: number, minimum: number, maximum: number) =>
  value >= minimum && value <= maximum;

const hasConsumed = (state: EngineState, setupId: string) =>
  state.consumedSetupIds.includes(setupId);

const consumePattern = (state: EngineState, pattern: BatPattern) => {
  if (!hasConsumed(state, pattern.setupId)) {
    state.consumedSetupIds.push(pattern.setupId);
    if (state.consumedSetupIds.length > 64) state.consumedSetupIds.shift();
  }
  const d = state.pivots.find(
    (pivot) => pivot.timestamp === pattern.pivots[4].timestamp,
  );
  if (d) d.traded = true;
};

const buildPattern = ({
  state,
  candle,
  atr,
  direction,
  options,
}: {
  state: EngineState;
  candle: Candle;
  atr: number | null;
  direction: Direction;
  options: EngineOptions;
}): BatPattern | null => {
  const pivots = findLatestPatternPivots(state, direction);
  if (!pivots) return null;
  const [xPivot, aPivot, bPivot, cPivot, dPivot] = pivots;
  const sign = direction === "LONG" ? 1 : -1;
  const [x, a, b, c, d] = pivots.map((pivot) => pivot.value * sign);

  const xaHeight = a! - x!;
  const abHeight = a! - b!;
  const bcHeight = c! - b!;
  const cdHeight = c! - d!;
  const adHeight = a! - d!;
  if (
    Math.min(xaHeight, abHeight, bcHeight, cdHeight, adHeight) <= 0 ||
    b! <= x! ||
    c! >= a! ||
    d! <= x! ||
    d! >= b!
  ) {
    return null;
  }

  const xToABars = aPivot.index - xPivot.index;
  const aToBBars = bPivot.index - aPivot.index;
  const bToCBars = cPivot.index - bPivot.index;
  const cToDBars = dPivot.index - cPivot.index;
  if (Math.min(xToABars, aToBBars, bToCBars, cToDBars) < options.minLegBars) {
    return null;
  }

  const xbRetracement = abHeight / xaHeight;
  const acRetracement = bcHeight / abHeight;
  const bdExtension = cdHeight / bcHeight;
  const xdRetracement = adHeight / xaHeight;
  const xdDeviation = Math.abs(xdRetracement - options.xdRetracement);
  if (
    !isWithin(
      xbRetracement,
      options.minXbRetracement,
      options.maxXbRetracement,
    ) ||
    !isWithin(
      acRetracement,
      options.minAcRetracement,
      options.maxAcRetracement,
    ) ||
    !isWithin(bdExtension, options.minBdExtension, options.maxBdExtension) ||
    xdDeviation > options.xdRetracementTolerance
  ) {
    return null;
  }

  const patternAgeBars = state.currentIndex - xPivot.index;
  if (patternAgeBars > options.maxPatternAgeBars) return null;

  const priceScale = Math.max(Math.abs(xPivot.value), Math.abs(aPivot.value));
  const patternHeightPct = priceScale > 0 ? (xaHeight / priceScale) * 100 : 0;
  const patternHeightAtr = atr != null && atr > 0 ? xaHeight / atr : 0;
  if (
    patternHeightPct < options.minPatternHeightPct ||
    patternHeightAtr < options.minPatternHeightAtr
  ) {
    return null;
  }

  const close = asNumber(candle.close);
  if (close == null) return null;
  const reversalDistance = close * sign - d!;
  if (reversalDistance < 0) return null;
  const entryDistanceAtr = atr != null && atr > 0 ? reversalDistance / atr : 0;
  if (
    options.maxEntryDistanceAtr > 0 &&
    atr != null &&
    atr > 0 &&
    entryDistanceAtr > options.maxEntryDistanceAtr
  ) {
    return null;
  }

  const kind: BatPatternKind =
    direction === "LONG" ? "bullish_bat" : "bearish_bat";
  const setupId = `${kind}:${pivots.map((pivot) => pivot.timestamp).join(":")}`;
  if (hasConsumed(state, setupId)) return null;

  return {
    setupId,
    kind,
    direction,
    entryStage: "d_confirmed",
    pivots,
    targetPrice: dPivot.value + sign * adHeight * options.targetAdRetracement,
    stopLossPrice: xPivot.value - sign * xaHeight * options.stopXaBuffer,
    xaHeight,
    patternHeightAtr,
    patternAgeBars,
    dConfirmationBars: state.currentIndex - dPivot.index,
    xToABars,
    aToBBars,
    bToCBars,
    cToDBars,
    xbRetracement,
    acRetracement,
    bdExtension,
    xdRetracement,
    xdDeviation,
    entryDistanceAtr,
    timestamp: candle.timestamp,
    close,
  };
};

export const buildBatSignalContext = (pattern: BatPattern) => ({
  setupId: pattern.setupId,
  patternKind: pattern.kind,
  signalDirection: pattern.direction,
  entryStage: pattern.entryStage,
  targetPrice: pattern.targetPrice,
  stopLossPrice: pattern.stopLossPrice,
  xaHeight: pattern.xaHeight,
  patternHeightAtr: pattern.patternHeightAtr,
  patternAgeBars: pattern.patternAgeBars,
  dConfirmationBars: pattern.dConfirmationBars,
  xToABars: pattern.xToABars,
  aToBBars: pattern.aToBBars,
  bToCBars: pattern.bToCBars,
  cToDBars: pattern.cToDBars,
  xbRetracement: pattern.xbRetracement,
  acRetracement: pattern.acRetracement,
  bdExtension: pattern.bdExtension,
  xdRetracement: pattern.xdRetracement,
  xdDeviation: pattern.xdDeviation,
  entryDistanceAtr: pattern.entryDistanceAtr,
  currentPrice: pattern.close,
  pivots: pattern.pivots.map(({ timestamp, value, kind }, index) => ({
    role: (["X", "A", "B", "C", "D"] as BatPivotRole[])[index],
    timestamp,
    value,
    kind,
  })),
});

export type BatSignalContext = ReturnType<typeof buildBatSignalContext>;

export const createBatEngine = ({
  config,
  initialCandles = [],
}: {
  config: BatConfig;
  initialCandles?: Candle[];
}): {
  next: (candle: Candle) => BatRuntimeState;
  getState: () => BatRuntimeState;
} => {
  const options = getConfigNumbers(config);
  const state: EngineState = {
    records: [],
    currentIndex: -1,
    pivots: [],
    pattern: null,
    consumedSetupIds: [],
    lastTimestamp: null,
  };
  const maxRecords = Math.max(
    options.maxPatternAgeBars + options.pivotLength * 2 + 5,
    options.atrPeriod + 2,
  );

  const snapshot = (): BatRuntimeState => ({
    pattern: state.pattern
      ? { ...state.pattern, pivots: [...state.pattern.pivots] }
      : null,
    pivots: state.pivots.map((pivot) => ({ ...pivot })),
  });

  const apply = (candle: Candle): BatRuntimeState => {
    if (state.lastTimestamp === candle.timestamp) return snapshot();
    state.lastTimestamp = candle.timestamp;
    state.pattern = null;
    pushBoundedRecord(state, candle, maxRecords);
    const pivotChanged = detectConfirmedPivot(state, options.pivotLength);
    if (!pivotChanged) return snapshot();

    const atr = calculateAtr(state.records, options.atrPeriod);
    const pattern =
      buildPattern({ state, candle, atr, direction: "LONG", options }) ??
      buildPattern({ state, candle, atr, direction: "SHORT", options });
    if (!pattern) return snapshot();

    consumePattern(state, pattern);
    state.pattern = pattern;
    return snapshot();
  };

  for (const candle of initialCandles) apply(candle);
  return { next: apply, getState: snapshot };
};
