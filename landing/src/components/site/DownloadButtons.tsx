import { DOWNLOAD_LINUX, DOWNLOAD_WINDOWS } from "@/lib/media";
import { cn } from "@/lib/utils";

export function DownloadButtons({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <a
        href={DOWNLOAD_WINDOWS}
        className="group glow-ring inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-all duration-300 hover:scale-[1.03]"
      >
        <WindowsMark />
        Download for Windows
      </a>
      <a
        href={DOWNLOAD_LINUX}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-mist px-6 py-3 text-sm font-medium text-foreground backdrop-blur transition-all duration-300 hover:scale-[1.03] hover:border-accent"
      >
        <LinuxMark />
        Download for Linux
      </a>
    </div>
  );
}

function WindowsMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M3 5.5 10.2 4.5v7.1H3V5.5Zm0 13L10.2 19.5v-7H3v6ZM11.4 4.3 21 3v8.6h-9.6V4.3Zm0 8.5H21V21l-9.6-1.3v-6.9Z" />
    </svg>
  );
}

function LinuxMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M12 2c2.4 0 3.6 1.9 3.4 4.6-.1 1.6.4 2.4 1.3 3.8 1.1 1.7 1.7 3 2.2 4.6.5 1.6.2 3-.9 3.6-.9.5-1.7.1-2.2-.4-.9 1.1-2.2 1.8-3.8 1.8s-2.9-.7-3.8-1.8c-.5.5-1.3.9-2.2.4-1.1-.6-1.4-2-.9-3.6.5-1.6 1.1-2.9 2.2-4.6.9-1.4 1.4-2.2 1.3-3.8C8.4 3.9 9.6 2 12 2Zm-1.6 4.1c-.4 0-.7.4-.7 1s.3 1 .7 1 .7-.4.7-1-.3-1-.7-1Zm3.2 0c-.4 0-.7.4-.7 1s.3 1 .7 1 .7-.4.7-1-.3-1-.7-1Z" />
    </svg>
  );
}
