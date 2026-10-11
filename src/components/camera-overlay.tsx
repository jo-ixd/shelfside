"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Mock camera, ported from the prototype's fakeCamera().
 * mode "scan": auto-"detects" after 2.4s and calls onScan.
 * mode "ai": shows a shutter; on tap pretends to enhance for 1.8s, then onShot.
 */
export function CameraOverlay({
  open,
  mode,
  onCancel,
  onScan,
  onShot,
}: {
  open: boolean;
  mode: "scan" | "ai";
  onCancel: () => void;
  onScan: () => void;
  onShot: () => void;
}) {
  const [enhancing, setEnhancing] = useState(false);
  const scanRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!open) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (mode === "scan") {
      timers.current.push(setTimeout(onScan, 2400));
    }
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  /* Animate the scanline via WAAPI (no extra global CSS). */
  useEffect(() => {
    if (!open) return;
    const el = scanRef.current;
    if (!el) return;
    const scanning = mode === "scan" || enhancing;
    if (!scanning) {
      el.style.opacity = "0";
      return;
    }
    el.style.opacity = "1";
    const anim = el.animate(
      [{ top: "10%" }, { top: "88%" }],
      {
        duration: 1600,
        direction: "alternate",
        iterations: Infinity,
        easing: "ease-in-out",
      }
    );
    return () => anim.cancel();
  }, [open, mode, enhancing]);

  if (!open) return null;

  const msg =
    mode === "scan"
      ? "Align the barcode in the frame"
      : enhancing
        ? "Enhancing with AI…"
        : "Frame the cover, then tap the shutter";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0c0a08]">
      <p className="mb-5 px-6 text-center text-base text-[#cfc5b0]">{msg}</p>
      <div className="relative h-[170px] w-[250px]">
        <span className="absolute top-0 left-0 size-7 rounded-[10px_0_0_0] border-3 border-primary border-r-0 border-b-0" />
        <span className="absolute top-0 right-0 size-7 rounded-[0_10px_0_0] border-3 border-primary border-l-0 border-b-0" />
        <span className="absolute bottom-0 left-0 size-7 rounded-[0_0_0_10px] border-3 border-primary border-r-0 border-t-0" />
        <span className="absolute bottom-0 right-0 size-7 rounded-[0_0_10px_0] border-3 border-primary border-l-0 border-t-0" />
        <div
          ref={scanRef}
          className="absolute inset-x-2 top-[10%] h-0.5 rounded bg-primary opacity-0 shadow-[0_0_12px_var(--primary)]"
        />
      </div>
      {mode === "ai" && !enhancing ? (
        <button
          type="button"
          aria-label="Capture"
          onClick={() => {
            setEnhancing(true);
            timers.current.push(setTimeout(onShot, 1800));
          }}
          className="mt-8 size-[72px] rounded-full border-4 border-[#cfc5b0] bg-primary"
        />
      ) : null}
      <button
        type="button"
        onClick={onCancel}
        className="mt-4 text-base text-muted-foreground/70"
      >
        Cancel
      </button>
    </div>
  );
}
