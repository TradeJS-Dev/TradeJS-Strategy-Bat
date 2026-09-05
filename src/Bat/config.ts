import { FEE_PERCENT as RISK_FEE_RATE } from "@tradejs/core/constants";
import {
  BacktestPriceMode,
  Direction,
  Interval,
  StrategyConfig,
} from "@tradejs/types";

export interface BatSideConfig {
  enable: boolean;
  direction: Direction;
  minRiskRatio: number;
}

export const config = {
  ENV: "BACKTEST",
  INTERVAL: "15" as Interval,
  MAKE_ORDERS: true,
  CLOSE_OPPOSITE_POSITIONS: false,
  BACKTEST_PRICE_MODE: "open" as const,
  AI_ENABLED: false,
  AI_MODE: "llm" as const,
  ML_ENABLED: false,
  ML_THRESHOLD: 0.1,
  MIN_AI_QUALITY: 4,
  RISK_FEE_RATE,
  RISK_SLIPPAGE_BPS: 0,
  RISK_MARKET_IMPACT_BPS: 0,
  MAX_LOSS_VALUE: 10,
  MA_FAST: 14,
  MA_MEDIUM: 49,
  MA_SLOW: 50,
  OBV_SMA: 10,
  ATR: 14,
  ATR_PCT_SHORT: 7,
  ATR_PCT_LONG: 30,
  BB: 20,
  BB_STD: 2,
  MACD_FAST: 12,
  MACD_SLOW: 26,
  MACD_SIGNAL: 9,
  BAT_PIVOT_LENGTH: 2,
  BAT_MIN_XB_RETRACEMENT: 0.32,
  BAT_MAX_XB_RETRACEMENT: 0.5,
  BAT_MIN_AC_RETRACEMENT: 0.38,
  BAT_MAX_AC_RETRACEMENT: 0.88,
  BAT_MIN_BD_EXTENSION: 1.61,
  BAT_MAX_BD_EXTENSION: 2.61,
  BAT_XD_RETRACEMENT: 0.886,
  BAT_XD_RETRACEMENT_TOLERANCE: 0.03,
  BAT_TARGET_AD_RETRACEMENT: 0.382,
  BAT_STOP_XA_BUFFER: 0.03,
  BAT_MIN_PATTERN_HEIGHT_PCT: 0.2,
  BAT_MIN_PATTERN_HEIGHT_ATR: 1,
  BAT_ATR_PERIOD: 14,
  BAT_MIN_LEG_BARS: 1,
  BAT_MAX_PATTERN_AGE_BARS: 220,
  BAT_MAX_ENTRY_DISTANCE_ATR: 1.5,
  BAT_EXIT_ON_OPPOSITE_PATTERN: true,
  LONG: {
    enable: true,
    direction: "LONG",
    minRiskRatio: 0.7,
  },
  SHORT: {
    enable: true,
    direction: "SHORT",
    minRiskRatio: 0.7,
  },
} as const;

export type BatConfig = StrategyConfig &
  Omit<
    typeof config,
    "BACKTEST_PRICE_MODE" | "LONG" | "SHORT" | "MIN_AI_QUALITY"
  > & {
    BACKTEST_PRICE_MODE: BacktestPriceMode;
    MIN_AI_QUALITY: number;
    LONG: BatSideConfig;
    SHORT: BatSideConfig;
  };
