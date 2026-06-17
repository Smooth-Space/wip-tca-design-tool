import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { ImageItem } from "@/lib/composition";
import type { AnimHandle } from "@/lib/anim";

const HOLD_SEC = 1.0; // pause with a card centered (tunable)
const EASE_SEC = 0.7; // slide to the next card (tunable; longer = smoother)
const GAP_PX = 8; // resting gap between cards, composition px (keep)
const CARD_H_FRAC = 0.82; // card height ÷ band height (tunable)
const MAX_W_FRAC = 0.9; // cap card width ÷ band width

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

      const gap = GAP_PX * dpr;
      const boxH = CARD_H_FRAC * H;
      const maxW = MAX_W_FRAC * W;

      // Native-aspect card sizes (contained in band height and capped width)
      const dims = els.map((el) => {
        const ar = el.naturalWidth && el.naturalHeight ? el.naturalWidth / el.naturalHeight : 1;
        let ch = boxH,
          cw = ch * ar;
        if (cw > maxW) {
          cw = maxW;
          ch = cw / ar;
        }
        return { cw, ch };
      });

      // Single image: center it, no motion.
      if (N === 1) {
        const { cw, ch } = dims[0];
        const left = (W - cw) / 2,
          top = (H - ch) / 2;
        if (els[0].complete && els[0].naturalWidth > 0) ctx.drawImage(els[0], left, top, cw, ch);
        if (imageOverlay > 0) {
          ctx.globalAlpha = imageOverlay;
          ctx.fillStyle = "#000";
          ctx.fillRect(left, top, cw, ch);
          ctx.globalAlpha = 1;
        }
        return;
      }

      // One set of cards: centers within the set + total set length (gap after each card).
      const Cset: number[] = [];
      let cur = 0;
      for (let i = 0; i < N; i++) {
        Cset[i] = cur + dims[i].cw / 2;
        cur += dims[i].cw + gap;
      }
      const setLen = cur;

      // Rigid strip shift: hold a card centered, then ease to center the next (wraps after N).
      const cyc = HOLD_SEC + EASE_SEC,
        total = N * cyc;
      const u = ((t % total) + total) % total;
      const k = Math.floor(u / cyc);
      const local = u - k * cyc;
      const f = local < HOLD_SEC ? 0 : smooth((local - HOLD_SEC) / EASE_SEC);
      const Ck = Cset[k];
      const nextC = k + 1 < N ? Cset[k + 1] : Cset[0] + setLen;
      const shift = W / 2 - (Ck + (nextC - Ck) * f);

      // Draw the set repeated across enough copies to overfill the band on both sides,
      // so cards recycle OFF-SCREEN (no on-screen pop). All cards share `shift` → rigid, smooth.
      const firstCopy = Math.floor((-shift - maxW) / setLen) - 1;
      const lastCopy = Math.floor((-shift + W + maxW) / setLen) + 1;
      const draws: { i: number; sx: number }[] = [];
      for (let c = firstCopy; c <= lastCopy; c++) {
        for (let i = 0; i < N; i++) {
          const sx = Cset[i] + c * setLen + shift;
          if (sx < -maxW || sx > W + maxW) continue;
          draws.push({ i, sx });
        }
      }
      draws.sort((a, b) => Math.abs(b.sx - W / 2) - Math.abs(a.sx - W / 2)); // centered card on top

      for (const { i, sx } of draws) {
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