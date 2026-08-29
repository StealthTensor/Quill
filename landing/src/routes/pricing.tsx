import { createFileRoute } from "@tanstack/react-router";
import { DownloadButtons } from "@/components/site/DownloadButtons";
import { PageShell, Prose } from "@/components/site/PageShell";
import { Reveal } from "@/components/site/Reveal";

const TITLE = "Pricing — Quill";
const DESCRIPTION =
  "Quill is free while in beta. Every feature, every platform, no card, no limits — just the desktop app.";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: PricingPage,
});

const INCLUDED = [
  "Unlimited portal scans",
  "AI worksheet generation with personas",
  "MCQ solving and submission",
  "Google Drive sync and auto-submit",
  "Live dashboard with streaming logs",
  "Smart caching and auto-updates",
  "Windows and Linux builds",
];

function PricingPage() {
  return (
    <PageShell
      eyebrow="Pricing"
      title="Free while in beta."
      intro="Quill is a student project solving a student problem. Right now there is one plan, it costs nothing, and it includes everything."
    >
      <Reveal>
        <div className="glow-ring rounded-3xl border border-border bg-card/70 p-8 backdrop-blur-sm sm:p-10">
          <p className="text-[0.7rem] tracking-[0.28em] text-accent uppercase">Beta</p>
          <div className="mt-4 flex items-end gap-3">
            <span className="font-display text-7xl leading-none text-foreground">₹0</span>
            <span className="pb-2 text-sm text-muted-foreground">/ forever, during beta</span>
          </div>
          <ul className="mt-8 space-y-3 text-sm text-foreground/85">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />
                {item}
              </li>
            ))}
          </ul>
          <DownloadButtons className="mt-10" />
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="rounded-3xl border border-dashed border-border p-8">
          <p className="text-[0.7rem] tracking-[0.28em] text-muted-foreground uppercase">
            Pro — later
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            When the beta ends there may be a paid tier for heavier AI usage and priority fixes when
            a portal changes. The core automation stays available at no cost, and nothing you have
            already installed will stop working.
          </p>
        </div>
      </Reveal>

      <Prose heading="Why is it free?">
        <p>
          The beta runs on a pooled, rate-limited AI backend and the value right now is feedback:
          every portal quirk you report makes the scraper more resilient.
        </p>
      </Prose>

      <Prose heading="Will my data be used to train anything?">
        <p>
          No. Quill has no central database and no telemetry pipeline for your documents. Worksheet
          content is sent only to the AI provider to generate an answer, and everything else stays
          on your machine.
        </p>
      </Prose>

      <Prose heading="What happens when the beta ends?">
        <p>
          You will be told inside the app well before anything changes, and existing installs will
          keep working on the version you have.
        </p>
      </Prose>
    </PageShell>
  );
}
