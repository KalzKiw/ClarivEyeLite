import { useState } from "react";
import { SettingsBack } from "@/components/SettingsNavRow";
import { Button, Card, ErrorNote, Field, TextInput } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

export function ProfilePage() {
  const { user, updateName, changePassword } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [nameMsg, setNameMsg] = useState("");
  const [nameErr, setNameErr] = useState("");
  const [editingPass, setEditingPass] = useState(false);
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [passMsg, setPassMsg] = useState("");
  const [passErr, setPassErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSaveName(event: React.FormEvent) {
    event.preventDefault();
    setNameErr("");
    setNameMsg("");
    setBusy(true);
    try {
      const u = await updateName(name);
      if (!u) setNameErr("No se pudo guardar el nombre");
      else setNameMsg("Nombre actualizado");
    } catch (e) {
      setNameErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function onPassword(event: React.FormEvent) {
    event.preventDefault();
    setPassErr("");
    setPassMsg("");
    if (newPass !== newPass2) {
      setPassErr("Las contraseñas nuevas no coinciden");
      return;
    }
    setBusy(true);
    try {
      const r = await changePassword(curPass, newPass);
      if (!r.ok) {
        setPassErr(r.error);
        return;
      }
      setPassMsg("Contraseña cambiada");
      setCurPass("");
      setNewPass("");
      setNewPass2("");
      setEditingPass(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <SettingsBack />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Datos sincronizados con tu email en la nube
        </p>
      </div>

      <Card className="space-y-4">
        <form onSubmit={(e) => void onSaveName(e)} className="space-y-3">
          <Field label="Nombre">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          </Field>
          <Field label="Email (login)">
            <TextInput value={user?.email ?? ""} disabled className="bg-muted/60" />
          </Field>
          <p className="text-xs leading-relaxed text-muted-foreground">
            El email no se puede cambiar aquí: es tu identidad de acceso. Al registrarte debes
            confirmar la cuenta (enlace o código del correo). Si necesitas otro email, crea una
            cuenta nueva.
          </p>
          <div className="rounded-xl bg-muted/50 px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Rol
            </p>
            <p className="text-sm font-semibold capitalize">{user?.role}</p>
          </div>
          <ErrorNote message={nameErr} />
          {nameMsg ? <p className="text-xs text-primary">{nameMsg}</p> : null}
          <Button type="submit" className="w-full" disabled={busy}>
            Guardar nombre
          </Button>
        </form>
      </Card>

      {!editingPass ? (
        <Button type="button" variant="ghost" className="w-full" onClick={() => setEditingPass(true)}>
          Cambiar contraseña
        </Button>
      ) : (
        <Card className="space-y-3">
          <p className="text-sm font-semibold">Nueva contraseña</p>
          <form onSubmit={(e) => void onPassword(e)} className="space-y-3">
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
            <ErrorNote message={passErr} />
            {passMsg ? <p className="text-xs text-primary">{passMsg}</p> : null}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => setEditingPass(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={busy}>
                Guardar
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
