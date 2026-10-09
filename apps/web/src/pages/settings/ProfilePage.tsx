import { useState } from "react";
import { SettingsBack } from "@/components/SettingsNavRow";
import { Button, Card, ErrorNote, Field, TextInput } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

export function ProfilePage() {
  const { user, changePassword } = useAuth();
  const [editingPass, setEditingPass] = useState(false);
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [passMsg, setPassMsg] = useState("");
  const [passErr, setPassErr] = useState("");

  function onPassword(event: React.FormEvent) {
    event.preventDefault();
    setPassErr("");
    setPassMsg("");
    if (newPass !== newPass2) {
      setPassErr("Las contraseñas nuevas no coinciden");
      return;
    }
    const r = changePassword(curPass, newPass);
    if (!r.ok) {
      setPassErr(r.error);
      return;
    }
    setPassMsg("Contraseña cambiada");
    setCurPass("");
    setNewPass("");
    setNewPass2("");
    setEditingPass(false);
  }

  return (
    <div className="space-y-4">
      <SettingsBack />
      <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>

      <Card className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">Nombre</p>
          <p className="text-sm font-medium">{user?.name}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Email</p>
          <p className="text-sm font-medium">{user?.email}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Rol</p>
          <p className="text-sm font-medium capitalize">{user?.role}</p>
        </div>
      </Card>

      {!editingPass ? (
        <Button type="button" variant="ghost" className="w-full" onClick={() => setEditingPass(true)}>
          Cambiar contraseña
        </Button>
      ) : (
        <Card className="space-y-3">
          <p className="text-sm font-medium">Cambiar contraseña</p>
          <form onSubmit={onPassword} className="space-y-3">
            <Field label="Contraseña actual">
              <TextInput
                type="password"
                autoComplete="current-password"
                value={curPass}
                onChange={(e) => setCurPass(e.target.value)}
                required
              />
            </Field>
            <Field label="Nueva contraseña">
              <TextInput
                type="password"
                autoComplete="new-password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                required
                minLength={4}
              />
            </Field>
            <Field label="Repetir nueva">
              <TextInput
                type="password"
                autoComplete="new-password"
                value={newPass2}
                onChange={(e) => setNewPass2(e.target.value)}
                required
                minLength={4}
              />
            </Field>
            {newPass2 && newPass !== newPass2 ? (
              <p className="text-xs text-destructive">No coinciden</p>
            ) : null}
            <ErrorNote message={passErr} />
            {passMsg ? <p className="text-xs text-primary">{passMsg}</p> : null}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setEditingPass(false);
                  setPassErr("");
                  setCurPass("");
                  setNewPass("");
                  setNewPass2("");
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                Guardar
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
