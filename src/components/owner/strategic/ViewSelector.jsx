import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MONTHS_FULL, VIEW_OPTIONS } from "./strategicUtils";

export function CompetenceSelector({ year, value, onChange }) {
  return (
    <Select value={String(value)} onValueChange={(next) => onChange(Number(next))}>
      <SelectTrigger aria-label="Competência" className="h-9 w-[168px] bg-card">
        <SelectValue placeholder="Competência" />
      </SelectTrigger>
      <SelectContent>
        {MONTHS_FULL.map((label, index) => (
          <SelectItem key={label} value={String(index)}>
            {label}/{year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function ViewSelector({ value, onChange }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label="Selecionar visualização" className="h-9 w-[148px] bg-card">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {VIEW_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
