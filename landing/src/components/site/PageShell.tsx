import type { ReactNode } from "react";
import { HERO_POSTER } from "@/lib/media";
import { Reveal } from "./Reveal";

export function PageShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[46vh] bg-cover bg-center opacity-25"
        style={{ backgroundImage: `url(${HERO_POSTER})` }}
      />
      <div aria-hidden="true" className="veil pointer-events-none absolute inset-x-0 top-0 h-[46vh]" />

      <div className="relative mx-auto max-w-3xl px-5 pt-36 pb-24 sm:px-8">
        <Reveal>
          <p className="text-[0.7rem] tracking-[0.32em] text-accent uppercase">{eyebrow}</p>
          <h1 className="mt-4 text-5xl leading-[1.05] text-balance-tight sm:text-6xl">{title}</h1>
          {intro ? (
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{intro}</p>
          ) : null}
        </Reveal>

        <Reveal delay={0.1} className="mt-14 space-y-10">
          {children}
        </Reveal>
      </div>
    </div>
  );
}

export function Prose({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-sm sm:p-8">
      <h2 className="text-2xl text-foreground">{heading}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
