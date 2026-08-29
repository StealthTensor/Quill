import { createFileRoute } from "@tanstack/react-router";
import { CONTACT_EMAIL } from "@/lib/media";
import { PageShell, Prose } from "@/components/site/PageShell";

const TITLE = "Privacy Policy — Quill";
const DESCRIPTION =
  "How Quill handles your data: everything stays on your machine. No central database, no telemetry, no selling of data.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <PageShell
      eyebrow="Privacy"
      title="Your work stays on your machine."
      intro="Last updated 29 August 2026. Quill is a local desktop application. It has no accounts and no central database — this policy explains exactly what that means for your data."
    >
      <Prose heading="What we store, and where">
        <p>
          Quill stores everything locally on your own device: portal credentials, AI settings,
          Google OAuth tokens, cached work and generated documents. None of it is transmitted to or
          held on any server operated by us.
        </p>
      </Prose>

      <Prose heading="Google user data">
        <p>
          When you connect Google Drive, Quill requests OAuth access only to create and manage a
          dedicated <code>/Quill</code> folder for your finished documents. The access token is saved
          on your machine and used solely to upload your files and read back the sharing link.
        </p>
        <p>
          Quill does not read your other Drive files, does not store your Google data on any server,
          and does not share or sell it. Quill's use of information received from Google APIs adheres
          to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. You can revoke access at any time from your{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2"
          >
            Google Account permissions
          </a>
          .
        </p>
      </Prose>

      <Prose heading="AI processing">
        <p>
          To generate answers, worksheet content is sent to the configured AI provider for that
          single request. That content is not stored by us and is not used to train any of our
          models. Review your chosen AI provider's own policy for how they handle request data.
        </p>
      </Prose>

      <Prose heading="What we do not do">
        <p>
          No analytics or telemetry pipeline tracks your documents. No advertising. No sale or
          sharing of personal data with third parties beyond the AI provider and Google Drive, both
          acting only to fulfil the action you triggered.
        </p>
      </Prose>

      <Prose heading="Deleting your data">
        <p>
          Because your data lives on your device, uninstalling Quill and removing its local
          configuration folder deletes it. Revoke the Google connection from your Google Account
          permissions page to cut Drive access.
        </p>
      </Prose>

      <Prose heading="Contact">
        <p>
          Questions about this policy? Email{" "}
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
