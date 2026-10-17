import { useId, type SelectHTMLAttributes } from "react";

import { fieldClasses } from "./field-styles";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hideLabel?: boolean;
}

// Lista desplegable nativa con la misma apariencia que Input
export default function Select({
  label,
  hideLabel = false,
  id,
  className = "",
  children,
  ...rest
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={selectId}
        className={hideLabel ? "sr-only" : "block text-sm font-medium text-ink"}
      >
        {label}
      </label>
      <select
        id={selectId}
        {...rest}

        className={fieldClasses(false, className)}
      >
        {children}
      </select>
    </div>
  );
}
