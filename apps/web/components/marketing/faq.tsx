import Link from "next/link"
import { Plus } from "lucide-react"

import { GITHUB_URL } from "@/lib/app"

const QUESTIONS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Is Polish free?",
    a: (
      <>
        Yes. The app is free and open source under the MIT license. Rewrites run on the AI you choose: your Claude Pro
        or Max plan costs nothing extra, and with an API key you pay that provider directly for what you use, usually a
        fraction of a cent per rewrite.
      </>
    ),
  },
  {
    q: "Which AI models does it work with?",
    a: (
      <>
        Your Claude subscription (through Claude Code installed on the same computer), or an API key for Anthropic,
        OpenAI, Google Gemini or xAI Grok. Any OpenAI-compatible server works too, including Ollama and LM Studio for
        models that run entirely on your machine.
      </>
    ),
  },
  {
    q: "Can you read what I polish?",
    a: (
      <>
        No. Text goes from your computer straight to the AI provider you picked. It never passes through Polish&rsquo;s
        servers, and API keys stay encrypted in your system keychain. See the{" "}
        <Link href="/privacy" className="text-white underline underline-offset-4">
          privacy policy
        </Link>
        .
      </>
    ),
  },
  {
    q: "Do I need an account?",
    a: (
      <>
        No. Polish works fully without one. An account only syncs your prompts, shortcuts and settings between computers,
        and lets you edit them from the web.
      </>
    ),
  },
  {
    q: "Which apps does it work in?",
    a: (
      <>
        Anywhere you can select text and paste: email, Slack, Teams, Notion, Word, Google Docs, your browser, your code
        editor. A few apps block simulated copy and paste, password fields for instance, and there Polish leaves the text
        alone.
      </>
    ),
  },
  {
    q: "Windows says “Windows protected your PC”. Is it safe?",
    a: (
      <>
        Windows shows that for new apps that haven&rsquo;t yet built up a reputation with Microsoft. Click{" "}
        <strong className="text-white">More info</strong>, then <strong className="text-white">Run anyway</strong>.
        Every installer is built from the public source code by GitHub Actions, so you can check exactly what you&rsquo;re
        running.
      </>
    ),
  },
  {
    q: "macOS won't open it. What do I do?",
    a: (
      <>
        Open <strong className="text-white">System Settings → Privacy &amp; Security</strong> and click{" "}
        <strong className="text-white">Open Anyway</strong> next to Polish. Then allow it under{" "}
        <strong className="text-white">Accessibility</strong>, which is what lets it press copy and paste for you.
      </>
    ),
  },
  {
    q: "How do updates work?",
    a: (
      <>
        Like VS Code: Polish checks in the background, downloads new versions, and shows &ldquo;Restart to
        update&rdquo;. If you don&rsquo;t restart, the update installs the next time Polish quits.
      </>
    ),
  },
  {
    q: "Can I run my own server?",
    a: (
      <>
        Yes. The web app and its database are in the same{" "}
        <a href={GITHUB_URL} className="text-white underline underline-offset-4">
          repository
        </a>
        , with a self-hosting guide in the README. Point the desktop app at your server under Account → Server.
      </>
    ),
  },
]

export function Faq() {
  return (
    <div className="space-y-3">
      {QUESTIONS.map(({ q, a }) => (
        <details
          key={q}
          className="group rounded-2xl border border-white/10 bg-white/[0.04] transition-colors open:bg-white/[0.07] hover:bg-white/[0.06]"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-6 py-5 text-left text-lg font-semibold [&::-webkit-details-marker]:hidden">
            {q}
            <Plus className="size-5 shrink-0 text-blue-300 transition-transform duration-200 group-open:rotate-45" />
          </summary>
          <p className="px-6 pb-6 text-base/relaxed text-blue-100/80">{a}</p>
        </details>
      ))}
    </div>
  )
}
