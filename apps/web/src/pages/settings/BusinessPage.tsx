import { useState } from "react";
import { SettingsBack } from "@/components/SettingsNavRow";
import { Button, Card, ErrorNote, Field, TextInput } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

export function BusinessPage() {
  const { user, business, renameBusiness } = useAuth();
  const isOwner = user?.role === "owner";
  const [bizName, setBizName] = useState(business?.name ?? "");
  const [bizMsg, setBizMsg] = useState("");
  const [bizErr, setBizErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onRename(event: React.FormEvent) {
    event.preventDefault();
    setBizErr("");
    setBizMsg("");
    if (!isOwner) {
      setBizErr("Solo el dueño puede renombrar el negocio");
      return;
    }
    setBusy(true);
    try {
      const b = await renameBusiness(bizName);
      if (!b) {
        setBizErr("Nombre demasiado corto");
        return;
      }
      setBizMsg("Nombre actualizado");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <SettingsBack />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Negocio</h1>
        <p className="mt-1 text-sm text-muted-foreground">Nombre que ves en el header · sync nube</p>
      </div>

      <Card className="space-y-3">
        {isOwner ? (
          <form onSubmit={(e) => void onRename(e)} className="space-y-3">
            <Field label="Nombre del negocio">
              <TextInput value={bizName} onChange={(e) => setBizName(e.target.value)} required />
            </Field>
            {business?.id ? (
              <p className="break-all font-mono text-[10px] text-muted-foreground">ID: {business.id}</p>
            ) : null}
            <ErrorNote message={bizErr} />
            {bizMsg ? <p className="text-xs font-medium text-primary">{bizMsg}</p> : null}
            <Button type="submit" className="w-full" disabled={busy}>
              Guardar
            </Button>
          </form>
        ) : (
          <p className="text-base font-semibold">{business?.name}</p>
        )}
      </Card>
    </div>
  );
}
