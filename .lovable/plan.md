# Phase 2 — MP4 export for the animated multi globe

Export the animated multi globe as a native-resolution, seamless-looping MP4 with title + captions composited in. Only available when `comp.variant === "multi" && comp.animate`. The loop/poses, tilt, size slider, textures, JPG export, and all other variants stay untouched.

## How it works

```text
ControlPanel "Export MP4"
        │
index.tsx handleExportMp4
  ├─ rasterize title+captions → transparent PNG (globe filtered out)
  ├─ sphere.setExporting(true)  (pause live rAF)
  └─ exportLoopMp4()
        loop i = 0..total-1:
          seekAndRender(i/fps)   → globe rendered at exact time t
          draw bg + globeCanvas + overlay onto a 2D capture canvas
          VideoEncoder.encode(VideoFrame) → mp4-muxer
          frame.close()          (release — memory stays flat)
        flush → finalize → download .mp4
```

Frames are encoded and released one at a time (never accumulated), so memory stays flat. Capture stops at frame `total` (the loop point equals frame 0) so playback is seamless with no snap at the wrap.

## Changes

### 1. `src/components/MultiSphere.tsx` — expose capture hooks
- Convert to `forwardRef` with a `MultiSphereHandle` imperative handle exposing `durationSec()`, `seekAndRender(t)`, `getCanvas()`, `setExporting(b)`.
- Add refs: `seekRef`, `canvasElRef`, `exportingRef`, `playingRef` (kept in sync with the `playing` prop).
- Add `preserveDrawingBuffer: true` to the `WebGLRenderer` options (safe canvas readback during capture).
- Record `canvasElRef.current = canvas` after the renderer's canvas is created.
- Refactor the rAF render closure into an extracted `renderFrame()` (billboard + render) plus a gated `loop()` that only auto-renders when not exporting; wire `seekRef.current` to pause the timeline, set its time, and render one synchronous frame.
- Tag the mount div with `data-globe="true"` so the overlay rasterizer can exclude it.
- Reset `seekRef`/`canvasElRef` in cleanup.
- Effect deps unchanged (`[images, w, h, imageOverlay, animSeed]`); the existing `globeScale` dolly effect is untouched.

### 2. Thread `sphereRef` from the page to the active sphere
Only one template mounts at a time, so a single ref attaches to whichever sphere is live.
- `src/routes/index.tsx`: create `const sphereRef = useRef<MultiSphereHandle>(null)` and pass it to `<Canvas … sphereRef={sphereRef} />`.
- `src/components/Canvas.tsx`: accept `sphereRef?: React.Ref<MultiSphereHandle>` and forward it to `TemplateA`, `TemplateBC`, and `TemplateD`.
- `TemplateA.tsx` / `TemplateBC.tsx` / `TemplateD.tsx`: accept `sphereRef` and put it on `<MultiSphere ref={sphereRef} … />` inside the existing `comp.animate ?` block.

### 3. New exporter module `src/lib/mp4Export.ts`
- Add dependency `mp4-muxer`.
- `pickCodec()` probes `VideoEncoder.isConfigSupported` across H.264 profiles (High@4.0/5.0, Main@4.0).
- `exportLoopMp4()` configures a `Muxer` (`fastStart: "in-memory"` so the moov atom is at the front for web/social playback) + `VideoEncoder` at 12 Mbps, loops over `total = round(durationSec * fps)` frames, composites bg → globe → overlay onto a 2D canvas, encodes + releases each `VideoFrame`, drains the encoder queue to keep the UI alive, then flushes, finalizes, and triggers a blob download.

### 4. `src/routes/index.tsx` — `handleExportMp4` + overlay rasterization
- Imports: switch to `import { toJpeg, toPng } from "html-to-image"`, add `exportLoopMp4` and the `MultiSphereHandle` type.
- State: `exportingMp4`, `mp4Progress`.
- `handleExportMp4()`: guards (node, sphere, canvas, duration, Chromium check with a friendly alert), rasterizes title+captions to a transparent PNG via `toPng` (globe filtered out via `data-globe`, transparent background, native size, `pixelRatio: 2`), pauses the live loop via `setExporting(true)`, runs `exportLoopMp4` at 30 fps for one loop, and always restores `setExporting(false)` in `finally`.
- Pass `onExportMp4`, `exportingMp4`, `mp4Progress` to `<ControlPanel />`.

### 5. `src/components/ControlPanel.tsx` — "Export MP4" button
- Add `onExportMp4?`, `exportingMp4?`, `mp4Progress?` to `Props` and destructure.
- In the Export section, after Export JPG, render the button only when `comp.variant === "multi" && comp.animate`, showing live percent while exporting.

## Constraints (v1)
- Native resolution per format, 30 fps, one seamless loop (~9s → 270 frames). No fps/length options yet.
- Silent (no audio).
- Chromium only (WebCodecs H.264) — friendly message in other browsers.

## Acceptance
- With multi + animate, "Export MP4" downloads an mp4 that plays a single seamless loop (no snap at the wrap), at native resolution, with crisp title + captions composited in, colors matching the preview.
- Memory stays flat during export; progress updates and the UI doesn't hard-freeze.
- JPG export, live animation, play/pause, reroll, the size slider, and all other variants are unchanged; the live animation resumes after export if it was playing.

## Technical notes
- `forwardRef`/`useImperativeHandle` is the only structural change to `MultiSphere`; the scene build, GSAP timeline, poses, tilt, and dolly logic are preserved exactly.
- `preserveDrawingBuffer: true` is required for reliable `drawImage(globeCanvas)` readback; it has negligible perf impact at this scale.
- The overlay is rasterized once (not per frame) and drawn over each globe frame, so per-frame cost stays low.
