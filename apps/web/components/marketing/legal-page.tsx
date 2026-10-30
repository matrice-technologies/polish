/** A long-form page (privacy, terms) on the night background, kept readable. */
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string
  updated: string
  intro: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <article className="mx-auto max-w-3xl px-6 pt-16">
      <h1 className="font-display text-5xl leading-[0.95] font-extrabold uppercase sm:text-6xl">{title}</h1>
      <p className="mt-4 text-sm text-blue-100/60">Last updated {updated}</p>
      <div className="mt-8 text-lg/relaxed text-blue-50/90">{intro}</div>
      <div className="mt-12 space-y-10 text-base/relaxed text-blue-100/85 [&_a]:text-white [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:uppercase [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_p+p]:mt-3 [&_strong]:text-white [&_ul]:mt-3 [&_ul]:space-y-2">
        {children}
      </div>
    </article>
  )
}
