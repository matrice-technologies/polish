"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function CopyButton({
  value,
  label = "Copy",
  className,
  variant = "outline",
}: {
  value: string
  label?: string
  className?: string
  variant?: "outline" | "ghost" | "secondary"
}) {
  const [copied, setCopied] = useState(false)

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className={cn("shrink-0", className)}
      onClick={async () => {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : label}
    </Button>
  )
}

/** Read-only code block with a copy affordance. */
export function CodeBlock({ code, className }: { code: string; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <pre className="bg-muted/40 overflow-x-auto rounded-md border p-3 pr-20 font-mono text-xs">
        <code>{code}</code>
      </pre>
      <CopyButton value={code} className="absolute top-2 right-2" variant="secondary" />
    </div>
  )
}
