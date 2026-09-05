export const makeCandle = (
  index: number,
  open: number,
  high: number,
  low: number,
  close: number,
) => ({
  timestamp: 1_700_000_000_000 + index * 60_000,
  dt: new Date(1_700_000_000_000 + index * 60_000).toISOString(),
  open,
  high,
  low,
  close,
  volume: 1_000,
  turnover: close * 1_000,
});

export const makeBullishBatCandles = () => [
  makeCandle(0, 110, 112, 108, 110),
  makeCandle(1, 105, 106, 100, 102),
  makeCandle(2, 130, 150, 120, 140),
  makeCandle(3, 180, 200, 175, 195),
  makeCandle(4, 175, 180, 170, 172),
  makeCandle(5, 155, 160, 150, 155),
  makeCandle(6, 165, 175, 160, 170),
  makeCandle(7, 185, 190, 180, 186),
  makeCandle(8, 150, 170, 140, 150),
  makeCandle(9, 120, 125, 111.4, 115),
  makeCandle(10, 120, 130, 115, 125),
];

export const mirrorBatCandles = (
  candles: ReturnType<typeof makeBullishBatCandles>,
) =>
  candles.map((candle) => ({
    ...candle,
    open: 300 - candle.open,
    high: 300 - candle.low,
    low: 300 - candle.high,
    close: 300 - candle.close,
    turnover: (300 - candle.close) * 1_000,
  }));
