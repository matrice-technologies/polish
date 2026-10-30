import "./styles.css"

import { useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import type { PickerItem } from "../../common/types"

import { Shortcut } from "@/components/kbd"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useDarkClass } from "@/hooks/use-system-theme"
import { polish } from "@/lib/polish"

/**
 * The prompt picker: shadcn's command palette, floating over whatever app the
 * text came from. The selection was copied before this opened; choosing a
 * prompt hides the picker, focus returns, and the result is pasted there.
 */
function Picker() {
  useDarkClass()
  const [items, setItems] = useState<PickerItem[]>([])
  const [query, setQuery] = useState("")
  const [value, setValue] = useState("")
  const input = useRef<HTMLInputElement>(null)
  const { platform } = polish.env

  useEffect(() => {
    const refresh = () => {
      setQuery("")
      void polish.getPickerItems().then((next) => {
        setItems(next)
        setValue(next[0]?.id ?? "")
      })
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

  return (
    <div className="flex h-full items-start justify-center p-3">
      <Command
        value={value}
        onValueChange={setValue}
        className="h-auto max-h-full rounded-xl border shadow-2xl"
        onKeyDown={(event) => {
          if (event.key === "Escape") polish.cancelPick()
          // 1–9 picks by position while the search box is empty.
          if (!query && /^[1-9]$/.test(event.key)) {
            const item = items[Number(event.key) - 1]
            if (item) {
              event.preventDefault()
              polish.pick(item.id)
            }
          }
        }}
      >
        <CommandInput ref={input} value={query} onValueChange={setQuery} placeholder="Polish with…" />
        <CommandList className="max-h-72">
          <CommandEmpty>No matching prompt.</CommandEmpty>
          <CommandGroup>
            {items.map((item, index) => (
              <CommandItem key={item.id} value={item.id} keywords={[item.name]} onSelect={() => polish.pick(item.id)}>
                <span className="w-3 text-center font-mono text-[11px] text-muted-foreground">
                  {!query && index < 9 ? index + 1 : ""}
                </span>
                <span className="flex-1 truncate">{item.name}</span>
                {item.shortcut ? <Shortcut accelerator={item.shortcut} platform={platform} /> : null}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  )
}

createRoot(document.getElementById("root")!).render(<Picker />)
