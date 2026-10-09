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

  function onRename(event: React.FormEvent) {
    event.preventDefault();
    setBizErr("");
    setBizMsg("");
    if (!isOwner) {
      setBizErr("Solo el dueño puede renombrar el negocio");
      return;
    }
    const b = renameBusiness(bizName);
    if (!b) {
      setBizErr("Nombre demasiado corto");
      return;
    }
    setBizMsg("Nombre actualizado");
  }

  return (
    <div className="space-y-4">
      <SettingsBack />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Negocio</h1>
        <p className="mt-1 text-sm text-muted-foreground">Nombre que ves en el header</p>
      </div>

      <Card className="space-y-3">
        {isOwner ? (
          <form onSubmit={onRename} className="space-y-3">
            <Field label="Nombre del negocio">
              <TextInput value={bizName} onChange={(e) => setBizName(e.target.value)} required />
            </Field>
            <ErrorNote message={bizErr} />
            {bizMsg ? <p className="text-xs font-medium text-primary">{bizMsg}</p> : null}
            <Button type="submit" className="w-full">
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
