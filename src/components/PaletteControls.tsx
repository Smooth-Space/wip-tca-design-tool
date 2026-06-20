import type { Composition, PaletteFormula, PaletteState } from "@/lib/composition";
import { TCA_SCALES, tcaColor, type TcaScale } from "@/lib/tcaColors";
import {
  applyPalette,
  bestPassingStep,
  fieldHueOf,
  isStepSelectable,
  resolvePalette,
  stepContrast,
  typeHueOf,
  TITLE_THRESHOLD,
  TEXT_THRESHOLD,
} from "@/lib/palette";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { X, Check } from "lucide-react";

const HUE_LABEL: Record<TcaScale, string> = {
  gray: "Gray",
  red: "Red",
  gold: "Gold",
  green: "Green",
  teal: "Teal",
  blue: "Blue",
  purple: "Purple",
};

// Representative step for each hue's round picker chip.
const HUE_CHIP_STEP: Record<TcaScale, number> = {
  gray: 12,
  red: 9,
  gold: 9,
  green: 9,
  teal: 9,
  blue: 9,
  purple: 9,
};

function HuePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TcaScale;
  onChange: (v: TcaScale) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {TCA_SCALES.map((s) => (
          <button
            key={s}
            type="button"
            title={HUE_LABEL[s]}
            onClick={() => onChange(s)}
            className={cn(
              "h-7 w-7 rounded-full border transition-shadow",
              value === s
                ? "border-ring ring-2 ring-ring ring-offset-1 ring-offset-background"
                : "border-border",
            )}
            style={{ background: tcaColor(s, HUE_CHIP_STEP[s]) }}
          />
        ))}
      </div>
    </div>
  );
}

function StepStrip({
  palette,
  hue,
  current,
  threshold,
  marker,
  onPick,
}: {
  palette: PaletteState;
  hue: TcaScale;
  current: number;
  threshold?: number;
  marker?: string;
  onPick: (step: number) => void;
}) {
  return (
    <div className="grid grid-cols-12 gap-0.5">
      {Array.from({ length: 12 }, (_, i) => i + 1).map((step) => {
        const selectable = threshold === undefined || isStepSelectable(palette, step, threshold);
        const selected = step === current;
        const ratio = threshold !== undefined ? stepContrast(palette, step) : undefined;
        return (
          <button
            key={step}
            type="button"
            disabled={!selectable}
            onClick={() => selectable && onPick(step)}
            title={ratio !== undefined ? `Step ${step} · ${ratio.toFixed(1)}:1` : `Step ${step}`}
            className={cn(
              "relative h-8 rounded-sm border transition-shadow",
              selected
                ? "border-ring ring-2 ring-ring"
                : selectable
                  ? "border-border hover:border-foreground/40"
                  : "border-border cursor-not-allowed",
            )}
            style={{
              background: tcaColor(hue, step),
              ...(!selectable
                ? {
                    backgroundImage:
                      "repeating-linear-gradient(45deg, rgba(0,0,0,0.28) 0 2px, transparent 2px 5px)",
                  }
                : {}),
            }}
          >
            {selected && marker && (
              <span
                className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
                style={{ color: tcaColor(hue, step <= 6 ? 12 : 1) }}
              >
                {marker}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ContrastReadout({ label, ratio }: { label: string; ratio: number }) {
  const pass = ratio >= 3.0;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 font-mono">
        {ratio.toFixed(2)}:1
        <span className={cn("rounded px-1 py-0.5 text-[10px] font-semibold", pass ? "bg-secondary text-secondary-foreground" : "bg-destructive text-destructive-foreground")}>
          {pass ? "AA-large" : "fail"}
        </span>
      </span>
    </div>
  );
}

export function PaletteControls({
  comp,
  update,
}: {
  comp: Composition;
  update: (patch: Partial<Composition>) => void;
}) {
  const p = comp.palette;

  // Apply a new palette state to the resolved fields.
  const apply = (next: PaletteState) => update(applyPalette(comp, next));

  // When formula / hue / background changes, re-land title & text on best passing steps.
  const reland = (partial: Partial<PaletteState>) => {
    const merged: PaletteState = { ...p, ...partial };
    const titleStep = bestPassingStep(merged, TITLE_THRESHOLD);
    apply({ ...merged, titleStep, textStep: titleStep });
  };

  const fieldHue = fieldHueOf(p);
  const typeHue = typeHueOf(p);
  const resolved = resolvePalette(p);
  const titleRatio = stepContrast(p, p.titleStep);
  const textRatio = stepContrast(p, p.textStep);

  return (
    <div className="space-y-4">
      {/* Formula */}
      <div className="space-y-1.5">
        <Label className="text-xs">Formula</Label>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {(["mono", "mixed"] as PaletteFormula[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => reland({ formula: f })}
              className={cn(
                "rounded-md py-1.5 text-sm font-medium transition-colors",
                p.formula === f
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "mono" ? "Monochrome" : "Mixed-hue"}
            </button>
          ))}
        </div>
      </div>

      {/* Hue(s) */}
      {p.formula === "mono" ? (
        <HuePicker label="Hue" value={p.hueA} onChange={(v) => reland({ hueA: v })} />
      ) : (
        <>
          <HuePicker label="Type hue" value={p.hueA} onChange={(v) => reland({ hueA: v })} />
          <HuePicker label="Field hue" value={p.hueB} onChange={(v) => reland({ hueB: v })} />
        </>
      )}

      {/* Graphic mode */}
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={p.graphic}
          onChange={(e) => apply({ ...p, graphic: e.target.checked })}
          className="h-4 w-4 rounded border-input"
        />
        <span>Graphic mode — allow low-contrast (felt, not read)</span>
      </label>

      {/* Background strip */}
      <div className="space-y-1.5">
        <Label className="text-xs">Background</Label>
        <StepStrip
          palette={p}
          hue={fieldHue}
          current={p.bgStep}
          marker="B"
          onPick={(step) => reland({ bgStep: step })}
        />
      </div>

      {/* Title strip */}
      <div className="space-y-1.5">
        <Label className="text-xs">Title</Label>
        <StepStrip
          palette={p}
          hue={typeHue}
          current={p.titleStep}
          threshold={TITLE_THRESHOLD}
          marker="T"
          onPick={(step) => apply({ ...p, titleStep: step })}
        />
      </div>

      {/* Text strip */}
      <div className="space-y-1.5">
        <Label className="text-xs">Text</Label>
        <StepStrip
          palette={p}
          hue={typeHue}
          current={p.textStep}
          threshold={TEXT_THRESHOLD}
          marker="t"
          onPick={(step) => apply({ ...p, textStep: step })}
        />
      </div>

      {/* Live contrast readouts */}
      <div className="space-y-1 rounded-md border border-border bg-muted/50 p-2">
        <ContrastReadout label="Title on background" ratio={titleRatio} />
        <ContrastReadout label="Text on background" ratio={textRatio} />
      </div>

      {/* Resolved field summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Background", color: resolved.background, scale: fieldHue, step: p.bgStep },
          { label: "Title", color: resolved.titleColor, scale: typeHue, step: p.titleStep },
          { label: "Text", color: resolved.textColor, scale: typeHue, step: p.textStep },
        ].map((f) => (
          <div key={f.label} className="space-y-1 text-[10px]">
            <div className="h-8 rounded-md border border-border" style={{ background: f.color }} />
            <div className="font-medium">{f.label}</div>
            <div className="font-mono uppercase text-muted-foreground">{f.color}</div>
            <div className="text-muted-foreground">
              {HUE_LABEL[f.scale]} · {String(f.step).padStart(2, "0")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
