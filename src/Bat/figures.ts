import {
  StrategyEntryModelFigures,
  StrategyFigureLine,
  StrategyFigurePoints,
} from "@tradejs/types";
import { BatPattern } from "./engine";

export const buildBatFigures = ({
  pattern,
  entryTimestamp,
  entryPrice,
}: {
  pattern: BatPattern;
  entryTimestamp: number;
  entryPrice: number;
}): StrategyEntryModelFigures => {
  const color = pattern.direction === "LONG" ? "#22c55e" : "#ef4444";
  const [x, , , , d] = pattern.pivots;
  const patternPoints = pattern.pivots.map(({ timestamp, value }) => ({
    timestamp,
    value,
  }));

  const lines: StrategyFigureLine[] = [
    {
      id: `bat-pattern-${entryTimestamp}`,
      kind: `bat_${pattern.kind}_xabcd`,
      points: patternPoints,
      color,
      width: 2,
      style: "solid",
    },
    {
      id: `bat-xd-${entryTimestamp}`,
      kind: "bat_xd_retracement",
      points: [
        { timestamp: x.timestamp, value: x.value },
        { timestamp: d.timestamp, value: d.value },
      ],
      color: "#2563eb",
      width: 2,
      style: "dashed",
    },
    {
      id: `bat-target-${entryTimestamp}`,
      kind: "bat_target",
      points: [
        { timestamp: d.timestamp, value: pattern.targetPrice },
        { timestamp: entryTimestamp, value: pattern.targetPrice },
      ],
      color: "#22c55e",
      width: 1,
      style: "dashed",
    },
    {
      id: `bat-stop-${entryTimestamp}`,
      kind: "bat_stop",
      points: [
        { timestamp: d.timestamp, value: pattern.stopLossPrice },
        { timestamp: entryTimestamp, value: pattern.stopLossPrice },
      ],
      color: "#ef4444",
      width: 1,
      style: "dashed",
    },
  ];

  const points: StrategyFigurePoints[] = [
    {
      id: `bat-pivots-${entryTimestamp}`,
      kind: `bat_${pattern.kind}_pivots`,
      points: patternPoints,
      color,
      radius: 4,
    },
    {
      id: `bat-entry-${entryTimestamp}`,
      kind: "bat_entry",
      points: [{ timestamp: entryTimestamp, value: entryPrice }],
      color,
      radius: 5,
    },
  ];

  return { lines, points };
};
