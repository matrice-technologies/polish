import { cn } from "@/lib/utils"

/** A chunky keyboard key: the product's signature object, drawn in CSS. */
export function Keycap({
  children,
  className,
  pressed,
  size = "md",
  style,
}: {
  children: React.ReactNode
  className?: string
  pressed?: boolean
  size?: "sm" | "md" | "lg"
  /** Also takes the float animation's custom properties. */
  style?: React.CSSProperties & Record<`--${string}`, string>
}) {
  return (
    <span
      style={style}
      className={cn(
        "inline-flex items-center justify-center rounded-xl border border-white/70 bg-gradient-to-b from-white to-blue-100 font-sans font-bold text-[#0a1440] select-none",
        "shadow-[0_4px_0_rgb(15_23_80),0_8px_18px_rgb(0_0_0/0.35)]",
        size === "sm" && "h-8 min-w-8 rounded-lg px-2 text-xs",
        size === "md" && "h-11 min-w-11 px-3 text-sm",
        size === "lg" && "h-16 min-w-16 rounded-2xl px-4 text-xl",
        pressed && "polish-press",
        className,
      )}
    >
      {children}
    </span>
  )
}
