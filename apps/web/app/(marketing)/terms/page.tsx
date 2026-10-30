import type { Metadata } from "next"

import { LegalPage } from "@/components/marketing/legal-page"
import { CONTACT_EMAIL, GITHUB_URL } from "@/lib/app"

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms for using the Polish app and its optional account service.",
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms"
      updated="October 30, 2026"
      intro={
        <p>
          Polish is a free, open-source app from Matrice Technologies. These terms cover the desktop app and the optional
          account service at polish.matricetechnologies.com. By using them, you agree to these terms.
        </p>
      }
    >
      <section>
        <h2>The software</h2>
        <p>
          The Polish source code and apps are licensed under the <a href={`${GITHUB_URL}/blob/main/LICENSE`}>MIT License</a>
          . You can use, modify and redistribute them under that license. As it says, they are provided &ldquo;as
          is&rdquo;, without warranty of any kind.
        </p>
      </section>

      <section>
        <h2>AI providers</h2>
        <p>
          Polish sends your text to the AI provider you choose. Your use of that provider is governed by its own terms,
          including Anthropic&rsquo;s when you use your Claude plan through Claude Code, and you are responsible for any
          charges it makes for your usage. Check AI output before you send it: models make mistakes.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <ul>
          <li>The account service is free and optional. Keep your sign-in email secure; you&rsquo;re responsible for activity on your account.</li>
          <li>Your prompts are yours. We store them only to sync them for you.</li>
          <li>
            Don&rsquo;t misuse the service: no attacking, overloading or probing it, no access to other people&rsquo;s
            data, and nothing unlawful.
          </li>
          <li>
            You can stop using it and ask us to delete your account at any time. We may suspend accounts that break
            these terms.
          </li>
        </ul>
      </section>

      <section>
        <h2>Availability and liability</h2>
        <p>
          We work to keep the service running but can&rsquo;t promise it will always be available, and we may change or
          discontinue it. The desktop app keeps working without it. To the extent the law allows, we&rsquo;re not
          liable for indirect losses or for losses caused by the service being unavailable.
        </p>
      </section>

      <section>
        <h2>Changes and contact</h2>
        <p>
          If these terms change, we&rsquo;ll update this page and its date. They are governed by French law. Questions:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </LegalPage>
  )
}
