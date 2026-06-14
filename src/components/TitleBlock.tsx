import { useMemo } from "react";
import { computeAxes, type Mode } from "@/lib/engine";
import type { Title } from "@/lib/composition";

interface TitleBlockProps {
  titles: Title[];
  titleMode: Mode;
  titleSeed: number;
  titleSizePx: number;
  titleColor: string;
}

export function TitleBlock({ titles, titleMode, titleSeed, titleSizePx, titleColor }: TitleBlockProps) {
  const rows = useMemo(() => titles.map((t) => t.text), [titles]);

  // One flat stream across ALL rows; axes computed once.
  const axes = useMemo(() => {
    const stream = rows.flatMap((r) => Array.from(r)); // spaces included, in order
    return computeAxes(stream, titleMode, titleSeed);
  }, [rows, titleMode, titleSeed]);

  // Start index of each row within the flat stream (no mutable counter in JSX).
  const rowStart = useMemo(() => {
    const starts: number[] = [];
    let acc = 0;
    for (const r of rows) {
      starts.push(acc);
      acc += Array.from(r).length;
    }
    return starts;
  }, [rows]);

  return (
    <div
      style={{
        lineHeight: 0.9,
        textAlign: "center",
        fontFamily: "'ABC Arizona Plus Variable'",
        fontSize: titleSizePx,
        letterSpacing: "-0.02em",
        color: titleColor,
      }}
    >
      {rows.map((row, r) => {
        const chars = Array.from(row);
        return (
          <div
            key={titles[r].id}
            style={{
              width: "fit-content",
              maxWidth: "100%",
              marginLeft: "auto",
              marginRight: "auto",
              whiteSpace: "normal",
              overflowWrap: "normal",
              wordBreak: "normal",
              hyphens: "none",
            }}
          >
            {chars.length === 0
              ? "\u00A0" /* keep empty rows as blank spacer lines */
              : chars.map((ch, i) => {
                  const a = axes[rowStart[r] + i];
                  return (
                    <span
                      key={i}
                      style={{
                        display: "inline",
                        fontVariationSettings: `'wght' ${a.wght}, 'SRFF' ${a.SRFF}, 'wdth' ${a.wdth}`,
                      }}
                    >
                      {ch}
                    </span>
                  );
                })}
          </div>
        );
      })}
    </div>
  );
}