import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QUILL_LOGO } from "@/lib/media";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
] as const;

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "border-b border-border bg-background/70 backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-16 flex h-20 items-center justify-between px-5 sm:px-8">
        <Link to="/" className="group flex items-center gap-3">
          <img
            src={QUILL_LOGO}
            alt="Quill logo"
            className="h-12 w-auto transition-transform duration-500 group-hover:-rotate-6"
          />
          <span className="font-display text-4xl leading-none text-foreground">Quill</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="rounded-full px-3 py-1.5 text-sm text-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/about"
            hash="download"
            className="ml-2 hidden rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground transition-transform duration-300 hover:scale-[1.04] sm:inline-block"
          >
            Download
          </Link>
        </nav>
      </div>
    </header>
  );
}
