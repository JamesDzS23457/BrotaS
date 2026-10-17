// Estilos compartidos por los campos de formulario (Input, Select y Textarea).
// El borde usa `edge` (contraste 3:1 con el blanco) para que el campo se distinga sin ver el color.
export const FIELD_BASE =
  "block min-h-12 w-full rounded-xl border bg-white px-3.5 py-3 text-base text-ink transition-[border-color,box-shadow] duration-150 placeholder:text-bark hover:border-vine focus-visible:border-stem focus-visible:shadow-[0_0_0_4px_rgb(50_104_117_/_0.22)] focus-visible:outline-none motion-reduce:transition-none";

export function fieldClasses(hasError: boolean, extra = ""): string {
  return `${FIELD_BASE} ${hasError ? "border-danger" : "border-edge"} ${extra}`;
}
