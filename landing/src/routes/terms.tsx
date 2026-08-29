import { createFileRoute } from "@tanstack/react-router";
import { CONTACT_EMAIL } from "@/lib/media";
import { PageShell, Prose } from "@/components/site/PageShell";

const TITLE = "Terms of Service — Quill";
const DESCRIPTION =
  "The terms for using Quill: beta software, provided as-is, and your responsibility to use it within your institution's rules.";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <PageShell
      eyebrow="Terms"
      title="The deal for using Quill."
      intro="Last updated 29 August 2026. By downloading or using Quill you agree to these terms. If you do not agree, do not use the app."
    >
      <Prose heading="Beta software, provided as-is">
        <p>
          Quill is early beta software offered free of charge and provided “as is”, without warranty
          of any kind. Portals change, and a scan or submission may fail. We are not liable for
          missed deadlines, lost marks, or any damage arising from use of the app.
        </p>
      </Prose>

      <Prose heading="Your responsibility">
        <p>
          You are responsible for how you use Quill, including compliance with your university's
          academic-integrity rules and any portal's terms of use. You confirm you are authorised to
          access the accounts and portals you connect. Use Quill only with your own credentials and
          your own coursework.
        </p>
      </Prose>

      <Prose heading="Accounts and third-party services">
        <p>
          Quill connects to services you authorise, such as your student portal, Google Drive and an
          AI provider. Your use of those services remains governed by their own terms. You are
          responsible for keeping your credentials and API keys secure on your device.
        </p>
      </Prose>

      <Prose heading="Acceptable use">
        <p>
          Do not use Quill to access accounts that are not yours, to break the law, or to violate the
          terms of any service it connects to. We may stop distributing the app or a given feature at
          any time.
        </p>
      </Prose>

      <Prose heading="Limitation of liability">
        <p>
          To the maximum extent permitted by law, the maintainer's total liability for any claim
          related to Quill is limited to zero, reflecting that the app is provided free of charge.
        </p>
      </Prose>

      <Prose heading="Changes">
        <p>
          These terms may be updated as the app evolves. Continued use after an update means you
          accept the revised terms.
        </p>
      </Prose>

      <Prose heading="Contact">
        <p>
          Questions? Email{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-accent underline underline-offset-2 break-all"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Prose>
    </PageShell>
  );
}
