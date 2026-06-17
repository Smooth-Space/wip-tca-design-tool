import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { ImageItem } from "@/lib/composition";
import type { AnimHandle } from "@/lib/anim";

const HOLD_SEC = 0.9; // pause with a card centered (snappier than before)
const EASE_SEC = 0.6; // slide to the next card
const GAP_PX = 8; // resting gap between cards, composition px
const CARD_H_FRAC = 0.75; // card height ÷ band height
const MAX_W_FRAC = 0.9; // cap card width ÷ band width (keep peek room)
const STAGGER_SEC = 0.12; // per-card lead-lag → bigger gap-fan during the slide

type Props = { images: ImageItem[]; imageOverlay: number; animSeed: number; playing: boolean };

export const SplitConveyor = forwardRef<AnimHandle, Props>(function SplitConveyor(
  { images, imageOverlay, animSeed, playing },
  ref,
) {
  const mountRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tRef = useRef(0);
  const exportingRef = useRef(false);
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const drawRef = useRef<(t: number) => void>(() => {});

  useImperativeHandle(
    ref,
    () => ({
      durationSec: () => (HOLD_SEC + EASE_SEC) * Math.max(images.length, 1),
      seekAndRender: (t) => drawRef.current(t),
      getCanvas: () => canvasRef.current,
      setExporting: (b) => {
        exportingRef.current = b;
      },
    }),
    [images.length],
  );

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    mount.appendChild(canvas);
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Image order = upload order; load + decode for crisp draws.
    const imgs = images.slice();
    const els = imgs.map((im) => {
      const e = new Image();
      e.src = im.src;
      return e;
    });
    Promise.all(els.map((e) => e.decode().catch(() => {}))).then(() =>
      drawRef.current(tRef.current),
    );

    const resize = () => {
      canvas.width = Math.round(mount.clientWidth * dpr);
      canvas.height = Math.round(mount.clientHeight * dpr);
      drawRef.current(tRef.current);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    const smooth = (e: number) => e * e * e * (e * (e * 6 - 15) + 10); // smootherstep

    drawRef.current = (t: number) => {
      const W = canvas.width,
        H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const N = els.length;
      if (N === 0) return;

      const GAP = GAP_PX * dpr;
      const boxH = CARD_H_FRAC * H;
      // constant card height; width from native aspect, capped to keep peek room
      const dims = els.map((el) => {
        const ar = el.naturalWidth && el.naturalHeight ? el.naturalWidth / el.naturalHeight : 1;
        const ch = boxH;
        const cw = Math.min(ch * ar, MAX_W_FRAC * W);
        return { cw, ch };
      });

      // cumulative strip centers C[] and total wrap length L
      const C: number[] = new Array(N);
      let cursor = 0;
      for (let i = 0; i < N; i++) {
        C[i] = cursor + dims[i].cw / 2;
        cursor += dims[i].cw + GAP;
      }
      const L = cursor; // includes trailing gap → seamless wrap

      const cycle = HOLD_SEC + EASE_SEC;
      const total = N * cycle;
      const shiftAt = (tt: number) => {
        const m = ((tt % total) + total) % total;
        const k = Math.floor(m / cycle);
        const local = m - k * cycle;
        const p = local < HOLD_SEC ? 0 : smooth((local - HOLD_SEC) / EASE_SEC);
        const c0 = C[k];
        const c1 = k + 1 < N ? C[k + 1] : C[0] + L;
        return W / 2 - (c0 + (c1 - c0) * p);
      };

      if (N === 1) {
        const { cw, ch } = dims[0];
        const left = W / 2 - cw / 2,
          top = (H - ch) / 2;
        const el = els[0];
        if (el.complete && el.naturalWidth > 0) ctx.drawImage(el, left, top, cw, ch);
        if (imageOverlay > 0) {
          ctx.globalAlpha = imageOverlay;
          ctx.fillStyle = "#000";
          ctx.fillRect(left, top, cw, ch);
          ctx.globalAlpha = 1;
        }
        return;
      }

      // undelayed screen offset of each card (px from center), wrapped to nearest copy
      const baseShift = shiftAt(t);
      const off = C.map((c) => {
        let rel = c + baseShift - W / 2;
        rel = (((rel % L) + L) % L);
        if (rel > L / 2) rel -= L;
        return rel;
      });
      // rank ascending by offset → leftmost = rank 0 leads, rightmost lags
      const delay: number[] = new Array(N);
      off
        .map((_, i) => i)
        .sort((a, b) => off[a] - off[b])
        .forEach((cardIdx, r) => {
          delay[cardIdx] = STAGGER_SEC * r;
        });

      const items: { i: number; sx: number }[] = [];
      for (let i = 0; i < N; i++) {
        const x = C[i] + shiftAt(t - delay[i]); // monotonic ease, per-card latency
        let rel = x - W / 2;
        rel = (((rel % L) + L) % L);
        if (rel > L / 2) rel -= L;
        items.push({ i, sx: W / 2 + rel });
      }
      items.sort((a, b) => Math.abs(b.sx - W / 2) - Math.abs(a.sx - W / 2)); // centered card on top

      for (const { i, sx } of items) {
        const { cw, ch } = dims[i];
        const left = sx - cw / 2,
          top = (H - ch) / 2;
        if (left + cw < 0 || left > W) continue;
        const el = els[i];
        if (el.complete && el.naturalWidth > 0) ctx.drawImage(el, left, top, cw, ch);
        if (imageOverlay > 0) {
          ctx.globalAlpha = imageOverlay;
          ctx.fillStyle = "#000";
          ctx.fillRect(left, top, cw, ch);
          ctx.globalAlpha = 1;
        }
      }
    };

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!exportingRef.current && playingRef.current) {
        tRef.current = tRef.current + dt;
        drawRef.current(tRef.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      drawRef.current = () => {};
      canvasRef.current = null;
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, [images, imageOverlay]);

  return <div ref={mountRef} data-anim="true" style={{ position: "absolute", inset: 0 }} />;
});