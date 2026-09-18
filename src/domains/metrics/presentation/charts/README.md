# Dashboard Mono Charts (vendored)

Amicro CLI (`@subhanhq/amicro`) did not expose install binaries in npm 1.0.1; charts were vendored manually under `src/components/ui/mono-*` using Recharts, matching Amicro Mono Charts prop contracts:

| Component | Props |
|-----------|--------|
| `MonoRoundedLineChart` | `data`, `theme`, `accentColor`, `valueFormatter`, `targetLine` |
| `MonoRoundedBarChart` | `data`, `theme`, `layout`, `accentColor`, `highlightNegative`, `negativeLabels`, `valueFormatter` |
| `MonoRoundedDonutChart` | `data`, `theme`, `centerLabel` |
| `MonoRoundedGaugeArc` | `progressPct`, `theme`, `label` |
| `MonoRoundedSparklineChart` | `data`, `theme`, `accentColor` |
| `MonoRoundedHeatmapChart` | `cells`, `theme` |

Presentation panels map dashboard DTOs to these props. Recharts imports stay inside vendored files only.
