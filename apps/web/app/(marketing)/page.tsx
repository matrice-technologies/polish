import { redirect } from "next/navigation"
import { ArrowRight, Check, Cloud, KeyRound, Laptop, Lock, MousePointerClick, Sparkles, X } from "lucide-react"

import { DownloadButtons } from "@/components/download-buttons"
import { Faq } from "@/components/marketing/faq"
import { HeroDemo } from "@/components/marketing/hero-demo"
import { Keycap } from "@/components/marketing/keycap"
import { GITHUB_URL } from "@/lib/app"
import { listMemberships } from "@/lib/auth"
import { latestRelease } from "@/lib/releases"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

/**
 * Two pages behind one route. A signed-in visitor is routed onward — new users
 * to onboarding, everyone else to their prompts — and a signed-out one gets
 * the landing page. `proxy.ts` lets `/` through unauthenticated for that reason.
 */
export default async function Page() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const memberships = await listMemberships()
    if (memberships.length === 0) redirect("/welcome")
    redirect(`/${memberships[0].workspaceSlug}/prompts`)
  }

  const release = await latestRelease()

  return (
    <>
      <Hero release={release} />
      <HowItWorks />
      <Features />
      <OpenSource />
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-6 pt-32">
        <h2 className="text-center font-display text-4xl font-extrabold uppercase sm:text-5xl">Questions</h2>
        <div className="mt-12">
          <Faq />
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-6 pt-32 text-center">
        <Sparkles className="mx-auto size-10 text-blue-300" />
        <h2 className="mt-6 font-display text-4xl leading-[1.05] font-extrabold uppercase text-balance sm:text-6xl">
          Ready to sound like your best self?
        </h2>
        <DownloadButtons links={release} className="mt-10" />
      </section>
    </>
  )
}

/* ------------------------------------------------------------------ hero ---- */

function Hero({ release }: { release: Awaited<ReturnType<typeof latestRelease>> }) {
  return (
    <section className="mx-auto max-w-7xl px-6 pt-10 pb-8 sm:px-10 lg:pt-20">
      <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12">
        <div className="text-center lg:text-left">
          <h1 className="font-display text-5xl leading-[0.95] font-extrabold uppercase sm:text-6xl xl:text-7xl">
            Rewrite anything.
            <br />
            <span className="text-blue-300">In any app.</span>
          </h1>
          <p className="mx-auto mt-8 max-w-xl text-lg/relaxed text-blue-50/90 lg:mx-0 lg:text-xl/relaxed">
            Select text anywhere, press a shortcut, and Polish rewrites it in place: fixed, shorter, more professional, or
            whatever your own prompts say. With your Claude plan or any AI you like.
          </p>
        </div>

        <div className="relative px-2 sm:px-6">
          {/* Floating keys and sparkles around the window, Discord-style. */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <Keycap
              size="lg"
              className="polish-float absolute -top-10 -left-2 rotate-[-12deg] blur-[1px] sm:-left-8"
              style={{ "--float-duration": "8s", "--float-rotate": "-12deg" }}
            >
              ⌘
            </Keycap>
            <Keycap
              size="lg"
              className="polish-float absolute -top-14 right-6 rotate-[10deg] opacity-80 blur-[3px]"
              style={{ "--float-duration": "9s", "--float-delay": "-3s", "--float-rotate": "10deg" }}
            >
              Shift
            </Keycap>
            <Keycap
              size="lg"
              className="polish-float absolute -right-4 bottom-10 rotate-[8deg] sm:-right-10"
              style={{ "--float-duration": "7s", "--float-delay": "-1.5s", "--float-rotate": "8deg" }}
            >
              1
            </Keycap>
            <Sparkles
              className="polish-float absolute -bottom-14 left-1/3 size-10 text-blue-300/80"
              style={{ "--float-duration": "6s", "--float-delay": "-2s" } as React.CSSProperties}
            />
          </div>
          <HeroDemo className="polish-float [--float-distance:-8px] [--float-duration:10s]" />
        </div>
      </div>

      <DownloadButtons links={release} className="mt-24" />
    </section>
  )
}

/* ---------------------------------------------------------- how it works ---- */

function HowItWorks() {
  const steps = [
    {
      icon: MousePointerClick,
      title: "Select",
      body: "Highlight text in any app: an email, a Slack message, a doc, a form.",
    },
    {
      icon: () => (
        <span className="flex items-center gap-1">
          <Keycap size="sm">Ctrl</Keycap>
          <Keycap size="sm">⇧</Keycap>
          <Keycap size="sm">1</Keycap>
        </span>
      ),
      title: "Press",
      body: "Each prompt has its own shortcut. Or open the picker and choose one.",
    },
    {
      icon: Sparkles,
      title: "Done",
      body: "The rewrite replaces your selection in about two seconds. Your clipboard is put back.",
    },
  ]
  return (
    <section className="mx-auto max-w-7xl px-6 pt-32 sm:px-10">
      <h2 className="text-center font-display text-4xl font-extrabold uppercase sm:text-5xl">Three moves</h2>
      <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
        {steps.map((step, i) => (
          <div key={step.title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
            <div className="flex h-10 items-center text-blue-300 [&_svg]:size-8">
              <step.icon />
            </div>
            <p className="mt-6 font-display text-sm font-bold text-blue-300">0{i + 1}</p>
            <h3 className="mt-1 font-display text-2xl font-extrabold uppercase">{step.title}</h3>
            <p className="mt-3 text-base/relaxed text-blue-100/80">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- features ---- */

function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl scroll-mt-24 space-y-28 px-6 pt-36 sm:px-10">
      <Panel
        title="Works everywhere you type"
        body="Polish lives in your tray and listens for your shortcuts. It copies the selection, rewrites it, and pastes it back, so it works in every app on your computer, with nothing to install inside them."
        art={<AppsArt />}
      />
      <Panel
        reverse
        title="Your prompts. Your shortcuts."
        body="Write prompts in plain words: fix my grammar, make it shorter, sound friendlier, translate to Spanish. Give each one a shortcut, and reach the rest from a quick picker."
        art={<PromptsArt />}
      />
      <Panel
        title="Bring your own AI"
        body="Use the Claude Pro or Max plan you already pay for, through Claude Code. Or plug in a key for Anthropic, OpenAI, Gemini or Grok, or run a model locally with Ollama."
        art={<ModelsArt />}
      />
      <Panel
        reverse
        title="Private by design"
        body="Your text goes from your computer straight to the AI you chose, never through our servers. Keys stay encrypted in your system keychain. An account is optional and only syncs your prompts."
        art={<PrivacyArt />}
      />
    </section>
  )
}

function Panel({
  title,
  body,
  art,
  reverse,
}: {
  title: string
  body: string
  art: React.ReactNode
  reverse?: boolean
}) {
  return (
    <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
      <div className={cn("min-w-0 rounded-[2rem] border border-white/10 bg-gradient-to-br from-blue-500/15 to-indigo-500/5 p-4 sm:p-12", reverse && "lg:order-2")}>
        {art}
      </div>
      <div>
        <h3 className="font-display text-4xl leading-[1.05] font-extrabold uppercase text-balance sm:text-5xl">{title}</h3>
        <p className="mt-6 max-w-lg text-lg/relaxed text-blue-100/85">{body}</p>
      </div>
    </div>
  )
}

function AppsArt() {
  const apps = [
    ["Mail", "bg-sky-500"],
    ["Slack", "bg-fuchsia-500"],
    ["Notion", "bg-zinc-200"],
    ["Word", "bg-blue-500"],
    ["Docs", "bg-indigo-400"],
    ["Teams", "bg-violet-500"],
    ["Browser", "bg-emerald-500"],
    ["VS Code", "bg-cyan-500"],
    ["Notes", "bg-amber-400"],
  ]
  return (
    <div className="grid grid-cols-3 gap-4">
      {apps.map(([name, color], i) => (
        <div
          key={name}
          className={cn(
            "flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-[#0a1440]/80 py-5 shadow-lg",
            i === 4 && "scale-105 border-blue-400/60 ring-4 ring-blue-500/20",
          )}
        >
          <span className={cn("flex size-10 items-center justify-center rounded-xl font-display text-sm font-bold text-[#0a1440]", color)}>
            {name[0]}
          </span>
          <span className="text-sm font-semibold">{name}</span>
        </div>
      ))}
    </div>
  )
}

function PromptsArt() {
  const prompts = [
    ["Polish", "1"],
    ["Shorter", "2"],
    ["Professional", "3"],
    ["Translate to English", null],
  ] as const
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0a1440]/90 p-2 shadow-2xl">
      <p className="px-4 pt-3 pb-2 text-sm text-blue-100/60">Polish with…</p>
      {prompts.map(([name, key], i) => (
        <div
          key={name}
          className={cn("flex items-center gap-3 rounded-xl px-3 py-3 sm:gap-4 sm:px-4 sm:py-3.5", i === 0 && "bg-white/10")}
        >
          <span className="w-4 font-mono text-sm text-blue-100/50">{i + 1}</span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-base">{name}</span>
          {key ? (
            <span className="flex gap-1">
              <Keycap size="sm">Ctrl</Keycap>
              <Keycap size="sm">⇧</Keycap>
              <Keycap size="sm">{key}</Keycap>
            </span>
          ) : (
            <span className="text-sm text-blue-100/50">picker</span>
          )}
        </div>
      ))}
    </div>
  )
}

function ModelsArt() {
  const models = [
    ["Claude plan", "Pro or Max, no key"],
    ["Anthropic", "API key"],
    ["OpenAI", "API key"],
    ["Gemini", "API key"],
    ["Grok", "API key"],
    ["Ollama", "On your machine"],
  ]
  return (
    <div className="grid grid-cols-2 gap-3">
      {models.map(([name, hint], i) => (
        <div
          key={name}
          className={cn(
            "relative rounded-2xl border bg-[#0a1440]/85 px-5 py-4",
            i === 0 ? "border-blue-400 ring-4 ring-blue-500/25" : "border-white/10",
          )}
        >
          <p className="text-base font-semibold">{name}</p>
          <p className="mt-0.5 text-sm text-blue-100/60">{hint}</p>
          {i === 0 ? (
            <span className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-blue-500">
              <Check className="size-3" strokeWidth={3} />
            </span>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function PrivacyArt() {
  const node = "flex flex-col items-center gap-2 rounded-2xl border px-4 py-5 text-center"
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
        <div className={cn(node, "border-white/15 bg-[#0a1440]/85")}>
          <Laptop className="size-7 text-blue-300" />
          <span className="text-sm font-semibold">Your computer</span>
          <span className="flex items-center gap-1 text-xs text-blue-100/60">
            <KeyRound className="size-3" /> keys in keychain
          </span>
        </div>
        <ArrowRight className="size-6 text-blue-300" />
        <div className={cn(node, "border-blue-400/60 bg-blue-500/15")}>
          <Sparkles className="size-7 text-blue-300" />
          <span className="text-sm font-semibold">Your AI provider</span>
          <span className="text-xs text-blue-100/60">the one you chose</span>
        </div>
      </div>
      <div className="flex items-center gap-4 rounded-2xl border border-dashed border-white/15 px-5 py-4">
        <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/5">
          <Cloud className="size-5 text-blue-100/50" />
          <X className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-rose-500 p-0.5 text-white" strokeWidth={3} />
        </span>
        <p className="text-sm/relaxed text-blue-100/75">
          <span className="font-semibold text-white">Polish servers never see your text.</span> They only sync prompts,
          if you sign in.
        </p>
      </div>
      <div className="flex items-center gap-2 text-sm text-blue-100/70">
        <Lock className="size-4 text-blue-300" /> Open source, so you can check every line.
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ open source ---- */

function OpenSource() {
  return (
    <section className="mx-auto max-w-7xl px-6 pt-36 sm:px-10">
      <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-blue-600 to-indigo-700 px-8 py-16 text-center sm:px-16 sm:py-20">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(600px_300px_at_50%_0%,rgb(255_255_255/0.18),transparent)]" />
        <div className="relative">
          <h2 className="font-display text-4xl leading-[1.05] font-extrabold uppercase text-balance sm:text-6xl">
            Free. Open source. Yours.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg/relaxed text-blue-50/90">
            Every line of Polish is on GitHub under the MIT license, and every installer is built from it in the open.
            Read it, fork it, run your own server, or send a pull request.
          </p>
          <a
            href={GITHUB_URL}
            className="mt-10 inline-flex h-14 items-center gap-3 rounded-2xl bg-white px-7 text-lg font-semibold text-[#0a1440] transition-all hover:-translate-y-0.5 hover:text-blue-700"
          >
            Star it on GitHub
            <ArrowRight className="size-5" />
          </a>
        </div>
      </div>
    </section>
  )
}
