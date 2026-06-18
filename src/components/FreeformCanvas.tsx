import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Composition } from "@/lib/composition";
import { TitleBlock } from "@/components/TitleBlock";

const FREEFORM_WIDTH = 1080;

export function FreeformCanvas({
  comp,
  compositionRef,
  selectedTitleId,
  onSelectTitle,
  hideSelection,
}: {
  comp: Composition;
  compositionRef?: React.Ref<HTMLDivElement>;
  selectedTitleId?: string | null;
  onSelectTitle?: (id: string | null) => void;
  hideSelection?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const rows = (comp.titles[0]?.text ?? "").split("\n").length;
  const [height, setHeight] = useState(
    Math.max(1, rows) * comp.titleSizePx * 0.85,
  );

  // Measure the natural height of the title block (auto-height artboard).
  useLayoutEffect(() => {
    const measure = () => {
      const el = innerRef.current;
      if (el && el.clientHeight > 0) setHeight(el.clientHeight);
    };
    measure();
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(measure);
    }
  }, [comp.titles, comp.titleMode, comp.titleSeed, comp.titleSizePx, comp.titleSizeMode, comp.titleShift, comp.titleShiftSeed]);

  // Scale-to-fit into the available preview area.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const pad = 64;
      const availW = el.clientWidth - pad;
      const availH = el.clientHeight - pad;
      setScale(Math.min(availW / FREEFORM_WIDTH, availH / height, 1));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full items-center justify-center overflow-hidden bg-muted"
      onClick={() => onSelectTitle?.(null)}
    >
      <div style={{ width: FREEFORM_WIDTH * scale, height: height * scale }} className="shadow-2xl">
        <div
          ref={compositionRef}
          style={{
            width: FREEFORM_WIDTH,
            height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            background: "#FFFFFF",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div ref={innerRef}>
            <TitleBlock
              titles={comp.titles}
              titleMode={comp.titleMode}
              titleSeed={comp.titleSeed}
              titleSizePx={comp.titleSizePx}
              titleColor="#000000"
              titleSizeMode={comp.titleSizeMode}
              titleShift={comp.titleShift}
              titleShiftSeed={comp.titleShiftSeed}
              contentWidthPx={FREEFORM_WIDTH}
              selectedTitleId={selectedTitleId}
              onSelectTitle={onSelectTitle}
              hideSelection={hideSelection}
            />
          </div>
        </div>
      </div>
    </div>
  );
}