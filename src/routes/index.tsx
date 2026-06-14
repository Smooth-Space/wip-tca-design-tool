import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toJpeg } from "html-to-image";
import { ControlPanel } from "@/components/ControlPanel";
import { Canvas } from "@/components/Canvas";
import { defaultComposition, type Composition, type Format } from "@/lib/composition";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Typographic Composer" },
      { name: "description", content: "A minimal tool for building typographic compositions." },
      { property: "og:title", content: "Typographic Composer" },
      { property: "og:description", content: "A minimal tool for building typographic compositions." },
    ],
  }),
  component: Index,
});

function Index() {
  const [comp, setComp] = useState<Composition>(defaultComposition);
  const compositionRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const NATIVE: Record<Format, [number, number]> = {
    "1:1": [1080, 1080],
    "4:5": [1080, 1350],
    "9:16": [1080, 1920],
  };

  async function handleExport() {
    const node = compositionRef.current;
    if (!node) return;
    setExporting(true);
    try {
      await document.fonts.ready;
      const [w, h] = NATIVE[comp.format];
      const opts = {
        width: w,
        height: h,
        canvasWidth: w,
        canvasHeight: h,
        pixelRatio: 1,
        quality: 0.95,
        backgroundColor: comp.background,
        style: {
          transform: "none",
          transformOrigin: "top left",
          margin: "0",
        },
      };
      // warm-up capture to avoid html-to-image first-render embedding quirk
      await toJpeg(node, {
        quality: 0.95,
        backgroundColor: comp.background,
        style: { transform: "none" },
      });
      const dataUrl = await toJpeg(node, opts);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `tca-${comp.format.replace(":", "x")}-${Date.now()}.jpg`;
      a.click();
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <ControlPanel
        comp={comp}
        setComp={setComp}
        onExport={handleExport}
        exporting={exporting}
      />
      <main className="flex-1">
        <Canvas comp={comp} compositionRef={compositionRef} />
      </main>
    </div>
  );
}
