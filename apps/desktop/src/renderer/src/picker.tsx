import "./styles.css"

import { useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { Search } from "lucide-react"
import { formatAccelerator, type Platform } from "@polish/shared"

import type { PickerItem } from "../../common/types"
import { polish } from "./api"
import { cn } from "./components/ui"

/**
 * The prompt picker. The selection has already been copied by the time this
 * opens; choosing a prompt hides the picker, focus goes back to the app the
 * text came from, and the result is pasted there.
 */
function Picker() {
  const [items, setItems] = useState<PickerItem[]>([])
  const [platform, setPlatform] = useState<Platform>("windows")
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const refresh = () => {
      setQuery("")
      setActive(0)
      void polish.getPickerItems().then(setItems)
      void polish.getState().then((state) => setPlatform(state.platform))
      input.current?.focus()
    }
    refresh()
    return polish.onPickerOpen(refresh)
  }, [])

  useEffect(() => {
    // Clicking away is cancelling.
    const onBlur = () => polish.cancelPick()
    window.addEventListener("blur", onBlur)
    return () => window.removeEventListener("blur", onBlur)
  }, [])

  const filtered = items.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()))
  const choose = (item: PickerItem | undefined) => item && polish.pick(item.id)

  return (
    <div className="flex h-full items-start justify-center p-3">
      <div
        className="bg-background flex max-h-full w-full flex-col overflow-hidden rounded-xl border shadow-2xl"
        onKeyDown={(event) => {
          if (event.key === "Escape") polish.cancelPick()
          else if (event.key === "ArrowDown") setActive((i) => Math.min(i + 1, filtered.length - 1))
          else if (event.key === "ArrowUp") setActive((i) => Math.max(i - 1, 0))
          else if (event.key === "Enter") choose(filtered[active])
          else if (/^[1-9]$/.test(event.key) && !query) choose(filtered[Number(event.key) - 1])
          else return
          event.preventDefault()
        }}
      >
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="text-muted-foreground size-3.5" />
          <input
            ref={input}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            placeholder="Polish with…"
            className="placeholder:text-muted-foreground h-10 flex-1 bg-transparent text-[13px] outline-none"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {filtered.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(item)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-[13px]",
                index === active && "bg-muted",
              )}
            >
              <span className="text-muted-foreground w-3 font-mono text-xs">{!query && index < 9 ? index + 1 : ""}</span>
              <span className="flex-1 truncate">{item.name}</span>
              {item.shortcut ? (
                <span className="text-muted-foreground font-mono text-xs">{formatAccelerator(item.shortcut, platform)}</span>
              ) : null}
            </button>
          ))}
          {filtered.length === 0 ? <p className="text-muted-foreground px-3 py-6 text-center text-xs">No matching prompt.</p> : null}
        </div>
      </div>
    </div>
  )
}

createRoot(document.getElementById("root")!).render(<Picker />)
