# @tradejs/strategy-bat

TradeJS strategy plugin providing `Bat`.

## Strategy overview

`Bat` detects the five-pivot XABCD harmonic reversal pattern in both
directions. The bullish form uses `low → high → low → high → low` and enters
long after `D` is confirmed. The bearish form is its exact mirror and enters
short.

The detector applies these ratios:

1. the `XB` retracement is encoded as `|AB| / |XA|` and must be `0.32–0.50`;
2. the `AC` retracement is encoded as `|BC| / |AB|` and must be `0.38–0.88`;
3. the `BD` extension is encoded as `|CD| / |BC|` and must be `1.61–2.61`;
4. the primary `XD` completion is `|AD| / |XA| = 0.886`, with a default
   absolute tolerance of `0.03`.

![Bat strategy logic](https://raw.githubusercontent.com/TradeJS-Dev/TradeJS-Strategy-Bat/main/docs/strategy-logic.svg)

## Signal geometry

![Bullish Bat signal](https://raw.githubusercontent.com/TradeJS-Dev/TradeJS-Strategy-Bat/main/docs/signal-example.svg)

The illustrations are schematic. Defaults use wick pivots and a two-bar
confirmed fractal, so the strategy never assumes that an unconfirmed `D` was
known earlier. The first target is a `0.382` retracement of `AD` from `D`. The
stop is placed `0.03 × XA` beyond `X`. Geometry, target, stop, pattern age, and
maximum entry distance are explicit config fields so research can change them
without changing detector code.

The package carries Bat geometry into AI payloads but does not ship an
unresearched strategy-specific local gate. AI is disabled by default.

## Install

```bash
yarn add @tradejs/strategy-bat
```

Register the package in `tradejs.config.ts`:

```ts
import { defineConfig } from "@tradejs/core/config";

export default defineConfig({
  strategies: ["@tradejs/strategy-bat"],
});
```

The package exports `strategyEntries`, the `Bat` strategy definition, manifest,
default config, and AI adapter.

## Development

```bash
yarn install --immutable
yarn checks
```

Publishing is beta-first and delegated to the pinned
`TradeJS-Workflows@v1` reusable workflow.

## Runtime host contract

All `@tradejs/*` runtime packages are peer dependencies. The consuming TradeJS
Project owns their exact installed versions and package manifest, so this
package never loads a hidden nested engine, types package, or Strategy Kit.
