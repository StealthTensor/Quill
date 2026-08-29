import { createFileRoute } from "@tanstack/react-router";
import { DownloadButtons } from "@/components/site/DownloadButtons";
import { PageShell, Prose } from "@/components/site/PageShell";
import { Reveal } from "@/components/site/Reveal";

const TITLE = "About — Quill";
const DESCRIPTION =
  "Quill is a native desktop app that scans your university portal, writes your worksheets in your voice, files them to Drive and submits the links.";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: AboutPage,
});

const FEATURES = [
  "Auto-scans the student portal for pending worksheets and MCQs",
  "Writes answers through your persona, then fills the original .docx",
  "Syncs to a private /Quill folder in your Google Drive and submits the link",
  "Live dashboard, smart caching, auto-updates — 100% local, no central database",
];

function AboutPage() {
  return (
    <PageShell
      eyebrow="About"
      title="Built by a student, for students."
      intro="Quill turns a Sunday of portal busywork into one click. It runs entirely on your machine — no accounts, no server holding your work."
    >
      <Prose heading="What it does">
        <ul className="space-y-3">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />
              {f}
            </li>
          ))}
        </ul>
      </Prose>

      <Reveal>
        <div
          id="download"
          className="glow-ring scroll-mt-28 rounded-3xl border border-border bg-card/70 p-8 backdrop-blur-sm sm:p-10"
        >
          <h2 className="text-3xl text-foreground">Get your semester back.</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Ships as a standalone build — no Python, no setup, no terminal. Free while in beta.
          </p>
          <DownloadButtons className="mt-8" />
          <p className="mt-4 text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Download links land here when the beta builds go live
          </p>
        </div>
      </Reveal>
    </PageShell>
  );
}
