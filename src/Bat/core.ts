import { round } from "@tradejs/core/math";
import {
  buildTradeEconomics,
  isStopLossOnCorrectSide,
} from "@tradejs/strategy-kit/risk";
import type {
  CreateStrategyCore,
  IndicatorsHistorySnapshot,
  Position,
} from "@tradejs/types";
import { BatConfig } from "./config";
import { buildBatSignalContext, createBatEngine } from "./engine";
import { buildBatFigures } from "./figures";

const isOpenPosition = (position: Position | null): position is Position =>
  Boolean(
    position &&
    typeof position.price === "number" &&
    Number.isFinite(position.price) &&
    typeof position.qty === "number" &&
    Number.isFinite(position.qty) &&
    position.qty > 0 &&
    (position.direction === "LONG" || position.direction === "SHORT"),
  );

const buildBatStateKey = (config: BatConfig) =>
  JSON.stringify({
    pivotLength: config.BAT_PIVOT_LENGTH,
    minXbRetracement: config.BAT_MIN_XB_RETRACEMENT,
    maxXbRetracement: config.BAT_MAX_XB_RETRACEMENT,
    minAcRetracement: config.BAT_MIN_AC_RETRACEMENT,
    maxAcRetracement: config.BAT_MAX_AC_RETRACEMENT,
    minBdExtension: config.BAT_MIN_BD_EXTENSION,
    maxBdExtension: config.BAT_MAX_BD_EXTENSION,
    xdRetracement: config.BAT_XD_RETRACEMENT,
    xdRetracementTolerance: config.BAT_XD_RETRACEMENT_TOLERANCE,
    targetAdRetracement: config.BAT_TARGET_AD_RETRACEMENT,
    stopXaBuffer: config.BAT_STOP_XA_BUFFER,
    minPatternHeightPct: config.BAT_MIN_PATTERN_HEIGHT_PCT,
    minPatternHeightAtr: config.BAT_MIN_PATTERN_HEIGHT_ATR,
    atrPeriod: config.BAT_ATR_PERIOD,
    minLegBars: config.BAT_MIN_LEG_BARS,
    maxPatternAgeBars: config.BAT_MAX_PATTERN_AGE_BARS,
    maxEntryDistanceAtr: config.BAT_MAX_ENTRY_DISTANCE_ATR,
  });

export const createBatCore: CreateStrategyCore<
  BatConfig,
  IndicatorsHistorySnapshot | undefined
> = async ({ config, data: initialData, strategyApi, indicatorsState }) => {
  const detectorState = strategyApi.createStateController<
    { engine: ReturnType<typeof createBatEngine> },
    ReturnType<ReturnType<typeof createBatEngine>["next"]>,
    ReturnType<ReturnType<typeof createBatEngine>["getState"]>
  >(
    "Bat",
    () => ({
      engine: createBatEngine({
        config,
        initialCandles: initialData,
      }),
    }),
    {
      configKey: buildBatStateKey(config),
      snapshot: (state) => state.engine.getState(),
    },
  );
  const lastTradeController = strategyApi.createLastTradeController({
    enabled: true,
  });
  const nextDetectorState = (
    candle: Parameters<ReturnType<typeof createBatEngine>["next"]>[0],
  ) =>
    detectorState.oncePerTimestamp(candle.timestamp, (state) =>
      state.engine.next(candle),
    );

  return async (candle) => {
    const runtimeState = nextDetectorState(candle);
    const pattern = runtimeState.pattern;
    if (!pattern) return strategyApi.skip("NO_PATTERN");

    const position = await strategyApi.getCurrentPosition();
    if (isOpenPosition(position)) {
      const oppositePattern = position.direction !== pattern.direction;
      if (Boolean(config.BAT_EXIT_ON_OPPOSITE_PATTERN) && oppositePattern) {
        return strategyApi.exit({
          code: "BAT_OPPOSITE_PATTERN_EXIT",
          direction: position.direction,
        });
      }
      return strategyApi.skip("POSITION_EXISTS");
    }

    if (lastTradeController.isInCooldown(candle.timestamp)) {
      return strategyApi.skip("DEV_TRADE_COOLDOWN");
    }

    const modeConfig =
      pattern.direction === "LONG" ? config.LONG : config.SHORT;
    if (!modeConfig.enable) return strategyApi.skip("STRATEGY_DISABLED");

    const { timestamp, currentPrice } =
      await strategyApi.getDecisionPriceContext();
    if (
      !isStopLossOnCorrectSide({
        direction: pattern.direction,
        currentPrice,
        stopLossPrice: pattern.stopLossPrice,
      })
    ) {
      return strategyApi.skip("INVALID_STOP");
    }

    const targetIsValid =
      pattern.direction === "LONG"
        ? pattern.targetPrice > currentPrice
        : pattern.targetPrice < currentPrice;
    if (!targetIsValid) return strategyApi.skip("TARGET_ALREADY_PASSED");

    const economics = buildTradeEconomics({
      entryPrice: currentPrice,
      stopLossPrice: pattern.stopLossPrice,
      takeProfitPrice: pattern.targetPrice,
      feeRate: Number(config.RISK_FEE_RATE ?? 0),
      slippageBps:
        Number(config.RISK_SLIPPAGE_BPS ?? 0) +
        Number(config.RISK_MARKET_IMPACT_BPS ?? 0),
    });
    const qty =
      economics.lossPerUnit > 0
        ? Number(config.MAX_LOSS_VALUE ?? 0) / economics.lossPerUnit
        : 0;
    if (!qty || !Number.isFinite(qty) || qty <= 0) {
      return strategyApi.skip("INVALID_QTY");
    }

    const riskRatio = economics.netRiskRatio;
    if (riskRatio <= modeConfig.minRiskRatio) {
      return strategyApi.skip(`RISK_RATIO:${round(riskRatio)}`);
    }

    const signalContext = {
      ...buildBatSignalContext({ ...pattern, close: currentPrice }),
      executionEconomics: {
        grossRiskRatio: economics.grossRiskRatio,
        netRiskRatio: economics.netRiskRatio,
        lossPerUnit: economics.lossPerUnit,
        rewardPerUnit: economics.rewardPerUnit,
      },
    };
    const indicators = indicatorsState.snapshot();
    lastTradeController.markTrade(timestamp);

    return strategyApi.entry({
      code:
        pattern.direction === "LONG"
          ? "BAT_BULLISH_D_CONFIRMED"
          : "BAT_BEARISH_D_CONFIRMED",
      direction: modeConfig.direction,
      indicators,
      additionalIndicators: { batContext: signalContext },
      figures: buildBatFigures({
        pattern,
        entryTimestamp: timestamp,
        entryPrice: currentPrice,
      }),
      orderPlan: {
        qty,
        stopLossPrice: pattern.stopLossPrice,
        takeProfits: [{ rate: 1, price: pattern.targetPrice }],
      },
    });
  };
};
