import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { HERO_VIDEO, QUILL_LOGO } from "@/lib/media";

const SESSION_KEY = "quill:intro-seen";

export function Preloader() {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.sessionStorage.getItem(SESSION_KEY)) {
      setVisible(false);
      return;
    }

    document.body.style.overflow = "hidden";

    const video = document.createElement("video");
    video.src = HERO_VIDEO;
    video.preload = "auto";
    video.muted = true;

    const markReady = () => setReady(true);
    video.addEventListener("canplaythrough", markReady);
    video.addEventListener("error", markReady);
    video.load();

    // Safety net: never trap the visitor behind a stalled network.
    const fallback = window.setTimeout(markReady, 6000);

    return () => {
      window.clearTimeout(fallback);
      video.removeEventListener("canplaythrough", markReady);
      video.removeEventListener("error", markReady);
      video.src = "";
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const id = window.setInterval(() => {
      setProgress((p) => {
        const ceiling = ready ? 100 : 92;
        if (p >= ceiling) return ceiling;
        const step = ready ? 6 : Math.max(0.8, (ceiling - p) * 0.06);
        return Math.min(ceiling, p + step);
      });
    }, 40);
    return () => window.clearInterval(id);
  }, [visible, ready]);

  useEffect(() => {
    if (progress < 100) return;
    const id = window.setTimeout(() => {
      window.sessionStorage.setItem(SESSION_KEY, "1");
      document.body.style.overflow = "";
      setVisible(false);
    }, 520);
    return () => window.clearTimeout(id);
  }, [progress]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="preloader"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-canopy"
          exit={{ clipPath: "inset(0 0 100% 0)", opacity: 0.9 }}
          transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
        >
          <div className="halo pointer-events-none absolute inset-0" />

          <motion.img
            src={QUILL_LOGO}
            alt=""
            aria-hidden="true"
            className="mb-10 h-14 w-auto opacity-90"
            animate={{ opacity: [0.4, 0.95, 0.4] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="relative flex items-baseline gap-2">
            <span className="font-display text-7xl leading-none text-foreground tabular-nums sm:text-8xl">
              {Math.floor(progress).toString().padStart(3, "0")}
            </span>
            <span className="text-sm tracking-[0.3em] text-muted-foreground uppercase">%</span>
          </div>

          <div className="mt-10 h-px w-56 overflow-hidden bg-border sm:w-72">
            <motion.div
              className="h-full bg-accent"
              style={{ width: `${progress}%` }}
              transition={{ ease: "linear" }}
            />
          </div>

          <p className="mt-6 text-[0.7rem] tracking-[0.32em] text-muted-foreground uppercase">
            Quill — loading
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
