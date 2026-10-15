import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

// Campo de texto con etiqueta
export default function Input({ label, id, className = "", ...rest }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
      {label}
      <input
        id={inputId}
        {...rest}
        className={`mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 ${className}`}
      />
    </label>
  );
}
