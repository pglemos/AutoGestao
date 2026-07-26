import DetailDrawer from "@/components/owner/DetailDrawer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { REFERENCE_YEAR } from "./strategicUtils";

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export default function FiltersDrawer({ open, onOpenChange }) {
  const { toast } = useToast();

  const handleApply = () => {
    onOpenChange(false);
    toast({ title: "Filtros aplicados", description: "A visão estratégica foi atualizada com os filtros selecionados." });
  };

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Filtros"
      description="Selecione os filtros para a visão estratégica."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleApply}>Aplicar</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <Label className="mb-1.5 block text-sm">Empresa</Label>
          <select className={selectClass} defaultValue="selected">
            <option value="selected">Empresa selecionada</option>
          </select>
        </div>
        <div>
          <Label className="mb-1.5 block text-sm">Unidade</Label>
          <select className={selectClass} defaultValue="selected">
            <option value="selected">Unidade selecionada</option>
          </select>
        </div>
        <div>
          <Label className="mb-1.5 block text-sm">Ano</Label>
          <select className={selectClass} defaultValue={String(REFERENCE_YEAR)}>
            <option value={String(REFERENCE_YEAR)}>{REFERENCE_YEAR}</option>
            <option value={String(REFERENCE_YEAR - 1)}>{REFERENCE_YEAR - 1}</option>
          </select>
        </div>
        <div>
          <Label className="mb-1.5 block text-sm">Departamento</Label>
          <select className={selectClass} defaultValue="todos">
            <option value="todos">Todos</option>
            <option value="vendas">Vendas</option>
            <option value="marketing">Marketing</option>
            <option value="estoque">Estoque</option>
            <option value="financeiro">Financeiro</option>
            <option value="operacional">Operacional</option>
          </select>
        </div>
        <div>
          <Label className="mb-1.5 block text-sm">Indicador</Label>
          <select className={selectClass} defaultValue="todos">
            <option value="todos">Todos</option>
          </select>
        </div>
      </div>
    </DetailDrawer>
  );
}
