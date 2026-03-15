"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

interface PriceSliderProps {
  min: number;
  max: number;
  minPrice: number;
  maxPrice: number;
  onChange: (min: number, max: number) => void;
}

export function PriceSlider({ min, max, minPrice, maxPrice, onChange }: PriceSliderProps) {
  const [localMin, setLocalMin] = useState(minPrice);
  const [localMax, setLocalMax] = useState(maxPrice);

  const handleMinChange = useCallback((value: string) => {
    const num = parseInt(value) || 0;
    const clamped = Math.min(num, localMax);
    setLocalMin(clamped);
    onChange(clamped, localMax);
  }, [localMax, onChange]);

  const handleMaxChange = useCallback((value: string) => {
    const num = parseInt(value) || max;
    const clamped = Math.max(num, localMin);
    setLocalMax(clamped);
    onChange(localMin, clamped);
  }, [localMin, onChange, max]);

  const handleSliderChange = (type: "min" | "max", value: number) => {
    if (type === "min") {
      const clamped = Math.min(value, localMax);
      setLocalMin(clamped);
      onChange(clamped, localMax);
    } else {
      const clamped = Math.max(value, localMin);
      setLocalMax(clamped);
      onChange(localMin, clamped);
    }
  };

  const minPercent = ((localMin - min) / (max - min)) * 100;
  const maxPercent = ((localMax - min) / (max - min)) * 100;

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-semibold mb-2 block">Price Range</Label>
        
        {/* Visual slider */}
        <div className="relative h-2 bg-muted rounded-full mb-4">
          <div
            className="absolute h-full bg-primary rounded-full"
            style={{
              left: `${minPercent}%`,
              right: `${100 - maxPercent}%`,
            }}
          />
          <input
            type="range"
            min={min}
            max={max}
            value={localMin}
            onChange={(e) => handleSliderChange("min", parseInt(e.target.value))}
            className="absolute w-full h-2 top-0 appearance-none bg-transparent pointer-events-none cursor-pointer z-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
          />
          <input
            type="range"
            min={min}
            max={max}
            value={localMax}
            onChange={(e) => handleSliderChange("max", parseInt(e.target.value))}
            className="absolute w-full h-2 top-0 appearance-none bg-transparent pointer-events-none cursor-pointer z-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
          />
        </div>

        {/* Input fields */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1 block">Min</Label>
            <Input
              type="number"
              value={localMin}
              onChange={(e) => handleMinChange(e.target.value)}
              placeholder="0"
              className="h-7 text-sm"
            />
          </div>
          <span className="text-xs text-muted-foreground pb-1">—</span>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1 block">Max</Label>
            <Input
              type="number"
              value={localMax}
              onChange={(e) => handleMaxChange(e.target.value)}
              placeholder={max.toString()}
              className="h-7 text-sm"
            />
          </div>
        </div>

        {/* Display range */}
        <p className="text-xs text-muted-foreground mt-2">
          {formatCurrency(localMin)} — {formatCurrency(localMax)}
        </p>
      </div>
    </div>
  );
}
