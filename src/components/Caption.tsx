import {
  CAPTION_FONT,
  CAPTION_LINE_HEIGHT,
  CAPTION_SIZE_PX,
  CAPTION_VARIATION,
} from "@/lib/typo";

// A single caption. Shared by TemplateLayout (B/C), Canvas infoRow (A) and Template D.
export function Caption({
  text,
  color,
  align,
  style,
}: {
  text: string;
  color: string;
  align: "left" | "right";
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        textAlign: align,
        fontFamily: CAPTION_FONT,
        fontVariationSettings: CAPTION_VARIATION,
        fontSize: CAPTION_SIZE_PX,
        lineHeight: CAPTION_LINE_HEIGHT,
        color,
        ...style,
      }}
    >
      {text}
    </div>
  );
}