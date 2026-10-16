import { useId, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

// Campo de texto con etiqueta y error en línea
export default function Input({ label, id, error, className = "", ...rest }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={inputId}
        {...rest}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`block w-full rounded-lg border bg-white px-3 py-2.5 text-ink transition-colors duration-150 placeholder:text-bark/70 focus-visible:border-stem ${
          error ? "border-danger" : "border-mist"
        } ${className}`}
      />
      {error ? (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
