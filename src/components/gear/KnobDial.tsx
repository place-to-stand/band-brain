"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface KnobDialProps {
  value: number; // 0-1
  onChange: (value: number) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

/**
 * Simple knob value input with visual arc indicator.
 * Type a number 0-10 directly for precision.
 */
export function KnobDial({
  value,
  onChange,
  disabled = false,
  size = "md",
}: KnobDialProps) {
  // Convert 0-1 to display value (0-10)
  const displayValue = Math.round(value * 10);

  // Size variants
  const sizeConfig = {
    sm: { wrapper: "w-10", input: "h-6 text-xs", arc: 28 },
    md: { wrapper: "w-12", input: "h-7 text-sm", arc: 36 },
    lg: { wrapper: "w-14", input: "h-8 text-base", arc: 44 },
  };

  const config = sizeConfig[size];

  // SVG arc parameters
  const arcSize = config.arc;
  const strokeWidth = 3;
  const radius = (arcSize - strokeWidth) / 2;
  const center = arcSize / 2;

  // Arc goes from 7 o'clock (-135°) to 5 o'clock (135°) = 270° total
  const startAngle = -135 * (Math.PI / 180);
  const endAngle = 135 * (Math.PI / 180);
  const valueAngle = startAngle + (value * (endAngle - startAngle));

  // Calculate arc path
  const startX = center + radius * Math.cos(startAngle - Math.PI / 2);
  const startY = center + radius * Math.sin(startAngle - Math.PI / 2);
  const valueX = center + radius * Math.cos(valueAngle - Math.PI / 2);
  const valueY = center + radius * Math.sin(valueAngle - Math.PI / 2);

  const largeArc = value > 0.5 ? 1 : 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty for typing
    if (val === "") return;

    const num = parseFloat(val);
    if (!isNaN(num)) {
      const clamped = Math.max(0, Math.min(10, num));
      onChange(clamped / 10);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || isNaN(parseFloat(val))) {
      // Reset to current value if invalid
      e.target.value = displayValue.toString();
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-0.5", config.wrapper)}>
      {/* Arc indicator */}
      <svg width={arcSize} height={arcSize} className="overflow-visible">
        {/* Background arc (gray) */}
        <path
          d={`M ${startX} ${startY} A ${radius} ${radius} 0 1 1 ${center + radius * Math.cos(endAngle - Math.PI / 2)} ${center + radius * Math.sin(endAngle - Math.PI / 2)}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="text-muted-foreground/20"
        />
        {/* Value arc (colored) */}
        {value > 0 && (
          <path
            d={`M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${valueX} ${valueY}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="text-primary"
          />
        )}
        {/* Value dot */}
        <circle
          cx={valueX}
          cy={valueY}
          r={strokeWidth}
          fill="currentColor"
          className="text-primary"
        />
      </svg>

      {/* Number input */}
      <Input
        type="number"
        min={0}
        max={10}
        step={0.5}
        defaultValue={displayValue}
        key={displayValue} // Reset when value changes externally
        onChange={handleInputChange}
        onBlur={handleBlur}
        disabled={disabled}
        className={cn(
          "text-center font-mono tabular-nums px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          config.input,
          disabled && "opacity-50 cursor-not-allowed"
        )}
      />
    </div>
  );
}
