"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";

export function Button1() {
  const [value, setValue] = React.useState(23);

  const increment = () => setValue((prev) => Math.min(prev + 1, 99));
  const decrement = () => setValue((prev) => Math.max(prev - 1, 0));

  return (
    <div className="mx-auto my-10 flex w-fit items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="flex items-center justify-center"
        onClick={decrement}
        disabled={value === 0}
        aria-label="Decrease value"
      >
        <Minus className="h-4 w-4" />
      </Button>

      <span
        className="text-foreground w-8 text-center text-sm leading-5"
        aria-live="polite"
        aria-label="Current value"
      >
        {value}
      </span>

      <Button
        variant="outline"
        size="icon"
        className="flex items-center justify-center"
        onClick={increment}
        disabled={value === 99}
        aria-label="Increase value"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
