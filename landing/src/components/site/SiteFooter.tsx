import { Link } from "@tanstack/react-router";
import { CONTACT_EMAIL, GITHUB_URL, QUILL_LOGO } from "@/lib/media";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-canopy">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-14 sm:px-8 md:flex-row md:justify-between">
        <div className="max-w-sm">
          <div className="flex items-center gap-3">
            <img src={QUILL_LOGO} alt="Quill logo" className="h-8 w-auto" />
            <span className="font-display text-2xl text-foreground">Quill</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Your coursework, on autopilot. A native desktop app for students who would rather spend
            the semester learning than clicking.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
          <div className="space-y-3">
            <p className="text-[0.7rem] tracking-[0.24em] text-muted-foreground uppercase">
              Product
            </p>
            <Link to="/" className="block text-foreground/80 hover:text-accent">
              Home
            </Link>
            <Link to="/pricing" className="block text-foreground/80 hover:text-accent">
              Pricing
            </Link>
            <Link to="/about" className="block text-foreground/80 hover:text-accent">
              About
            </Link>
          </div>
          <div className="space-y-3">
            <p className="text-[0.7rem] tracking-[0.24em] text-muted-foreground uppercase">Legal</p>
            <Link to="/privacy" className="block text-foreground/80 hover:text-accent">
              Privacy
            </Link>
            <Link to="/terms" className="block text-foreground/80 hover:text-accent">
              Terms
            </Link>
          </div>
          <div className="space-y-3">
            <p className="text-[0.7rem] tracking-[0.24em] text-muted-foreground uppercase">
              Contact
            </p>
            <a href={GITHUB_URL} className="block text-foreground/80 hover:text-accent">
              GitHub
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`} className="block break-all text-foreground/80 hover:text-accent">
              Email
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} Quill. Built by a student, for students.</p>
          <p>Windows · Linux · runs entirely on your machine.</p>
        </div>
      </div>
    </footer>
  );
}
