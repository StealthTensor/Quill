import { createFileRoute } from "@tanstack/react-router";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { DownloadButtons } from "@/components/site/DownloadButtons";
import { HERO_POSTER, HERO_VIDEO, QUILL_LOGO } from "@/lib/media";

const TITLE = "Quill — Your coursework, on autopilot.";
const DESCRIPTION =
  "Quill scans your university portal, writes your worksheets in your own voice, syncs them to Drive and submits them. One click, zero busywork.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:image", content: HERO_POSTER },
      { name: "twitter:image", content: HERO_POSTER },
    ],
  }),
  component: Index,
});

function Index() {
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const videoY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "14%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "-8%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, reduce ? 1 : 0]);

  return (
    <section ref={heroRef} className="relative min-h-[100svh] overflow-hidden">
      <motion.div style={{ y: videoY }} className="absolute inset-0 -top-[10%] h-[120%]">
        <video
          className="h-full w-full object-cover"
          src={HERO_VIDEO}
          poster={HERO_POSTER}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      </motion.div>
      {/* Neutral scrims — no green tint on the video. */}
      <div aria-hidden="true" className="scrim absolute inset-0" />
      <div aria-hidden="true" className="scrim-left absolute inset-0" />

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative flex min-h-[100svh] flex-col justify-center py-32 pr-5 px-28"
      >


        <motion.h1
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 max-w-3xl leading-[0.98] font-extrabold text-balance-tight sm:text-6xl lg:text-7xl"
        >
          Your coursework, <span className="text-accent">on autopilot.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mt-7 max-w-xl text-lg leading-relaxed text-foreground/80"
        >
          A native desktop app that scans your university portal, writes the worksheets in your own
          voice, files them to Drive and submits the links. You just press start.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <DownloadButtons className="mt-10" />
          <p className="mt-4 text-xs font-medium tracking-[0.2em] text-foreground/60 uppercase">
            Free while in beta · Windows &amp; Linux · nothing leaves your machine
          </p>
        </motion.div>
      </motion.div>

      <motion.div
        aria-hidden="true"
        className="absolute bottom-8 left-1/2 h-10 w-px -translate-x-1/2 bg-foreground/40"
        animate={reduce ? undefined : { scaleY: [0.3, 1, 0.3], opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
    </section>
  );
}
