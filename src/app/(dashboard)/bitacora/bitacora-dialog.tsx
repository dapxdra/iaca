"use client";

import { Plus } from "lucide-react";
import { FormDialog } from "@/components/ui/dialog";
import { BitacoraForm, type ProyectoOption } from "@/components/offline/bitacora-form";
import { useOutbox } from "@/components/offline/outbox-provider";

export function BitacoraDialog({
  proyectos,
  proyectoIdFijo,
}: {
  proyectos: ProyectoOption[];
  proyectoIdFijo?: string;
}) {
  // El layout monta el provider para todo rol con bitácora; sin él no hay a
  // nombre de quién encolar la entrada.
  const outbox = useOutbox();
  if (!outbox) return null;

  return (
    <FormDialog
      dataCy="bitacora-new"
      triggerLabel={
        <>
          <Plus className="h-4 w-4" /> Nueva entrada
        </>
      }
      triggerSize="sm"
      title="Nueva entrada de bitácora"
      description="Se registra a tu nombre y con la fecha indicada."
    >
      {(close) => (
        <BitacoraForm
          ownerId={outbox.userId}
          proyectos={proyectos}
          proyectoIdFijo={proyectoIdFijo}
          onDone={close}
        />
      )}
    </FormDialog>
  );
}
