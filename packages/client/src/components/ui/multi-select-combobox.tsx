"use client"

import * as React from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export type Option = { label: string; value: string }

interface MultiSelectComboBoxProps {
  options: Option[]
  value?: string[]
  onChange?: (values: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  id?: string
}

export function MultiSelectComboBox({
  options,
  value = [],
  onChange,
  placeholder = "Choose spaces...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  id,
}: MultiSelectComboBoxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedOptions = React.useMemo(
    () => options.filter((opt) => value.includes(opt.value)),
    [options, value]
  )

  const toggleOption = (option: Option) => {
    const newValues = value.includes(option.value)
      ? value.filter((v) => v !== option.value)
      : [...value, option.value]
    onChange?.(newValues)
  }

  const removeOption = (optionValue: string) => {
    onChange?.(value.filter((v) => v !== optionValue))
  }

  // ---- Overflow measurement
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const chevronRef = React.useRef<SVGSVGElement>(null)
  const measureRowRef = React.useRef<HTMLDivElement>(null)
  const plusMeasureRef = React.useRef<HTMLSpanElement>(null)

  const [visibleCount, setVisibleCount] = React.useState<number>(selectedOptions.length)

  const GAP = 8 // matches gap-2
  const PADDING_BUFFER = 10 // tiny safety margin

  const measurePlusWidth = React.useCallback((n: number) => {
    const el = plusMeasureRef.current
    if (!el) return 0
    el.textContent = `+${n}`
    // ensure it's up-to-date before reading
    const rect = el.getBoundingClientRect()
    return rect.width
  }, [])

  const recomputeVisible = React.useCallback(() => {
    const trigger = triggerRef.current
    const chevron = chevronRef.current
    const measureRow = measureRowRef.current
    if (!trigger || !chevron || !measureRow) return

    const triggerW = trigger.clientWidth
    if (triggerW <= 0) return // hidden? avoid bad math

    const chevronW = chevron.getBoundingClientRect().width
    let remaining = triggerW - chevronW - GAP - PADDING_BUFFER
    if (remaining <= 0) {
      if (visibleCount !== 0) setVisibleCount(0)
      return
    }

    // Collect pre-measured badge widths
    const children = Array.from(measureRow.children) as HTMLElement[]
    const n = children.length
    const widths = children.map((el) => el.getBoundingClientRect().width)

    // Accumulate widths with gaps, while reserving room for potential +N
    let count = 0
    let used = 0

    const takeWouldFit = (w: number, addGap: boolean) => {
      const need = (addGap && count > 0 ? GAP : 0) + w
      return used + need <= remaining
    }

    // Greedy fit with reservation for "+(n-count)"
    while (count < n) {
      // Width for this next badge
      const w = widths[count]
      const willHaveHidden = (count + 1) < n
      const plusW = willHaveHidden ? measurePlusWidth(n - (count + 1)) : 0

      // If we take this badge, total occupied becomes: used + [gap?] + w
      const needForBadge = (count > 0 ? GAP : 0) + w

      // After taking it, we might also need to show +N (with a gap if at least one visible)
      const needForPlus = willHaveHidden
        ? ((count + 1 > 0 ? GAP : 0) + plusW)
        : 0

      if (used + needForBadge + needForPlus <= remaining) {
        used += needForBadge
        count++
      } else {
        break
      }
    }

    // If none fit, check if we can at least show +N alone
    if (count === 0 && n > 0) {
      const plusW = measurePlusWidth(n)
      if (plusW > remaining) {
        // nothing visible, not even +N
        if (visibleCount !== 0) setVisibleCount(0)
        return
      }
    }

    if (count !== visibleCount) setVisibleCount(count)
  }, [visibleCount, measurePlusWidth])

  // Run on selection changes, popover open/close
  React.useEffect(() => {
    // Use rAF to measure after layout settles
    const id = requestAnimationFrame(() => recomputeVisible())
    return () => cancelAnimationFrame(id)
  }, [recomputeVisible, selectedOptions.length, open])

  // Recompute on resize of the trigger
  React.useEffect(() => {
    const ro = new ResizeObserver(() => recomputeVisible())
    if (triggerRef.current) ro.observe(triggerRef.current)
    return () => ro.disconnect()
  }, [recomputeVisible])

  // Recompute when fonts finish loading (avoids wrong widths right after mount)
  React.useEffect(() => {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => recomputeVisible())
    }
  }, [recomputeVisible])

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full min-h-[40px] h-auto px-2 justify-start overflow-hidden"
          >
            {/* Visible row: single line, no wrap */}
            <div className="flex flex-1 items-center gap-2 overflow-hidden flex-nowrap min-w-0">
              {selectedOptions.length > 0 ? (
                <>
                  {selectedOptions.slice(0, visibleCount).map((option) => (
                    <Badge
                      key={option.value}
                      variant="outline"
                      className="flex items-center gap-1 shrink-0"
                      title={option.label}
                    >
                      {option.label}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeOption(option.value)
                        }}
                      />
                    </Badge>
                  ))}
                  {visibleCount < selectedOptions.length && (
                    <Badge
                      variant="secondary"
                      className="shrink-0 cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); setOpen(true) }}
                      title={selectedOptions.slice(visibleCount).map(o => o.label).join(", ")}
                    >
                      +{selectedOptions.length - visibleCount}
                    </Badge>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground truncate">{placeholder}</span>
              )}
            </div>

            {/* Chevron pinned right */}
            <ChevronDown ref={chevronRef} className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        {/* Hidden measurement row (off-screen, stable) */}
        <div className="absolute pointer-events-none invisible -z-10">
          <div ref={measureRowRef} className="inline-flex items-center gap-2">
            {selectedOptions.map((option) => (
              <span
                key={option.value}
                className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs"
              >
                {option.label}
                <span className="inline-block w-3 h-3 ml-1" />
              </span>
            ))}
          </div>
          {/* Hidden +N measurer uses same typography/border paddings as a Badge */}
          <span
            ref={plusMeasureRef}
            className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs"
            style={{ position: "absolute", visibility: "hidden" }}
          >
            +99
          </span>
        </div>

        <PopoverContent
          side="bottom"
          align="start"
          className="w-[var(--radix-popover-trigger-width)] p-0"
        >
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList className="max-h-72 overflow-auto">
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = value.includes(option.value)
                  return (
                    <CommandItem
                      key={option.value}
                      onSelect={() => toggleOption(option)}
                      className="flex items-center gap-2"
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-sm border",
                          isSelected ? "bg-primary text-primary-foreground" : "opacity-50"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      {option.label}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}