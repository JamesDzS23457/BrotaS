import { useId, type TextareaHTMLAttributes } from "react";

import { fieldClasses } from "./field-styles";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

// Área de texto con etiqueta y la misma apariencia que Input
export default function Textarea({ label, id, className = "", ...rest }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <div className="space-y-1.5">
      <label htmlFor={textareaId} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <textarea id={textareaId} {...rest} className={fieldClasses(false, className)} />
    </div>
  );
}
