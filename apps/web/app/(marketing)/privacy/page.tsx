import type { Metadata } from "next"

import { LegalPage } from "@/components/marketing/legal-page"
import { CONTACT_EMAIL, GITHUB_URL } from "@/lib/app"

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Polish collects (very little), where your text goes, and your rights.",
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      updated="October 30, 2026"
      intro={
        <p>
          Polish is built so that the words you rewrite never reach us. This page explains what the app and this website
          do with your data, in plain language. Polish is operated by Matrice Technologies (&ldquo;we&rdquo;).
        </p>
      }
    >
      <section>
        <h2>The text you polish</h2>
        <p>
          When you press a shortcut, the desktop app sends the selected text and the prompt&rsquo;s instructions{" "}
          <strong>directly from your computer to the AI provider you chose</strong>: Anthropic (including through Claude
          Code with your Claude plan), OpenAI, Google, xAI, or a server you point it at, such as Ollama on your own
          machine. It never passes through our servers, and we never see it. That provider&rsquo;s own privacy policy
          applies to what you send it.
        </p>
      </section>

      <section>
        <h2>On your computer</h2>
        <ul>
          <li>
            Your prompts, shortcuts and settings are stored in a file in the app&rsquo;s data folder on your computer.
          </li>
          <li>
            API keys are encrypted with your operating system&rsquo;s keychain and never leave your computer, not even
            when you sync. If you sign in, your session is encrypted the same way.
          </li>
          <li>
            To copy and paste for you, Polish briefly uses your clipboard and puts back what was on it. It does not keep
            a history of what you rewrite.
          </li>
        </ul>
      </section>

      <section>
        <h2>Updates and downloads</h2>
        <p>
          Installers are downloaded from, and the app checks for updates on, GitHub (github.com), which receives your IP
          address as part of those requests under{" "}
          <a href="https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement">
            GitHub&rsquo;s privacy statement
          </a>
          . No other usage data, telemetry or crash reports are sent.
        </p>
      </section>

      <section>
        <h2>If you create an account</h2>
        <p>An account is optional. It lets you sync between computers and edit your prompts on the web. We store:</p>
        <ul>
          <li>Your email address, and your name and avatar if you add them.</li>
          <li>Your prompts (names, instructions and shortcuts) and your Polish settings.</li>
          <li>
            For each desktop sign-in, the device name the app reports (&ldquo;Polish on&rdquo; your computer&rsquo;s
            name) and when it was approved. Unapproved sign-in codes are deleted within a day.
          </li>
        </ul>
        <p>
          We never store your API keys or the text you rewrite. Sign-in links are emailed through Google Workspace. Our
          servers are hosted by Hostinger. We don&rsquo;t sell your data or share it with anyone else.
        </p>
      </section>

      <section>
        <h2>This website</h2>
        <p>
          No analytics, advertising or tracking cookies. When you sign in, we set one session cookie so you stay signed
          in. Our server keeps standard technical logs (such as IP addresses and requests) for security, for a limited
          time.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          You can view, edit and delete your prompts at any time on the web. To get a copy of your data, correct it, or
          delete your account and everything in it, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and
          we&rsquo;ll do it within 30 days. Under the GDPR you also have the right to object and to complain to your
          data protection authority (in France, the <a href="https://www.cnil.fr">CNIL</a>).
        </p>
        <p>
          We process account data to provide the service you signed up for, and keep it until you delete your account.
          Polish is not intended for children under 16.
        </p>
      </section>

      <section>
        <h2>Check it yourself</h2>
        <p>
          Polish is open source, so everything above can be verified in the <a href={GITHUB_URL}>source code</a>. If this
          policy changes, we&rsquo;ll update this page and the date at the top.
        </p>
      </section>
    </LegalPage>
  )
}
