import type { Composition } from "@/lib/composition";
import type { Placement } from "@/lib/multiLayout";
import { Caption } from "@/components/Caption";
import { CoverImage, MultiImages, Overlay } from "@/components/ImageLayers";

export function TemplateA({
  comp,
  w,
  h,
  imgSrc,
  title,
  multiPlacements,
}: {
  comp: Composition;
  w: number;
  h: number;
  imgSrc: string;
  title: React.ReactNode;
  multiPlacements: Placement[];
}) {
  const infoRow = (
    <div style={{ display: "flex", gap: 40, alignItems: "flex-end" }}>
      <Caption text={comp.captions.text1} color={comp.captionColors.text1} align="left" style={{ flex: 1 }} />
      <Caption text={comp.captions.text2} color={comp.captionColors.text2} align="left" style={{ flex: 1 }} />
    </div>
  );

  if (comp.variant === "full") {
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <CoverImage src={imgSrc} />
          <Overlay opacity={comp.imageOverlay} style={{ inset: 0 }} />
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: 40,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div className="flex flex-1 flex-col justify-center">{title}</div>
          {infoRow}
        </div>
      </div>
    );
  }

  if (comp.variant === "multi") {
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <MultiImages images={comp.images} placements={multiPlacements} imageOverlay={comp.imageOverlay} />
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            padding: 40,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div className="flex flex-1 flex-col justify-center">{title}</div>
          {infoRow}
        </div>
      </div>
    );
  }

  if (comp.variant === "split") {
    const imageTop = comp.splitOrder === "image-first";
    const imageHalf = (
      <div
        style={
          {
            position: "absolute",
            left: 0,
            right: 0,
            height: h / 2,
            [imageTop ? "top" : "bottom"]: 0,
          } as React.CSSProperties
        }
      >
        <CoverImage src={imgSrc} />
        <Overlay opacity={comp.imageOverlay} style={{ inset: 0 }} />
      </div>
    );
    const titleHalf = (
      <div
        style={
          {
            position: "absolute",
            left: 0,
            right: 0,
            height: h / 2,
            [imageTop ? "bottom" : "top"]: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: imageTop ? "40px 40px 130px 40px" : "40px",
            boxSizing: "border-box",
          } as React.CSSProperties
        }
      >
        {title}
      </div>
    );
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        {imageHalf}
        {titleHalf}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 40 }}>
          {infoRow}
        </div>
      </div>
    );
  }

  // none
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: 40,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div className="flex flex-1 flex-col justify-center">{title}</div>
      {infoRow}
    </div>
  );
}