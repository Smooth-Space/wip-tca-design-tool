import type { Axes } from "@/lib/engine";
import { TITLE_FONT, TITLE_LETTER_SPACING, TITLE_LINE_HEIGHT } from "@/lib/typo";

// Per-character spans for one line of title text. Shared by TitleBlock (A/B/C)
// and the single-line TitleLine used by Template D.
export function TitleSpans({
  text,
  axes,
  startOffset,
}: {
  text: string;
  axes: Axes[];
  startOffset: number;
}) {
  const chars = Array.from(text);
  if (chars.length === 0) return <>{"\u00A0"}</>;
  return (
    <>
      {chars.map((ch, i) => {
        const a = axes[startOffset + i];
        return (
          <span
            key={i}
            style={{
              display: "inline",
              fontVariationSettings: a
                ? `'wght' ${a.wght}, 'SRFF' ${a.SRFF}, 'wdth' ${a.wdth}`
                : undefined,
            }}
          >
            {ch}
          </span>
        );
      })}
    </>
  );
}

// A complete single title line (container + centered inner + spans). Used by Template D.
export function TitleLine({
  text,
  axes,
  startOffset,
  titleSizePx,
  color,
}: {
  text: string;
  axes: Axes[];
  startOffset: number;
  titleSizePx: number;
  color: string;
}) {
  return (
    <div
      style={{
        lineHeight: TITLE_LINE_HEIGHT,
        textAlign: "center",
        fontFamily: TITLE_FONT,
        fontSize: titleSizePx,
        letterSpacing: TITLE_LETTER_SPACING,
        color,
      }}
    >
      <div
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
        <TitleSpans text={text} axes={axes} startOffset={startOffset} />
      </div>
    </div>
  );
}
