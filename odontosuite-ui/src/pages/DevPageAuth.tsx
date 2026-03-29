import { useMemo, useState } from "react";

type Clinic = { id: number; name: string; slug: string };

type BootstrapReq = {
  clinicName: string;
  clinicSlug: string;
  adminEmail: string;
  adminPassword: string;
};

type LoginReq = {
  email: string;
  password: string;
};

function safeJsonParse<T = any>(s: string): T | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function decodeJwt(token: string) {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    // base64url -> base64
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
    const json = atob(b64 + pad);

    // decode UTF-8 safely
    const bytes = Uint8Array.from(json, (c) => c.charCodeAt(0));
    const decoded = new TextDecoder("utf-8").decode(bytes);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function DevAuthPage() {
  const IDENTITY_BASE = import.meta.env.VITE_IDENTITY_BASE ?? "http://localhost:8083";
  const ADMIN_BASE = import.meta.env.VITE_ADMIN_BASE ?? "http://localhost:8082";

  const [bootstrap, setBootstrap] = useState<BootstrapReq>({
    clinicName: "Odonto Centro",
    clinicSlug: "odonto-centro",
    adminEmail: "admin@odonto.com",
    adminPassword: "Admin123!Admin123!",
  });

  const [login, setLogin] = useState<LoginReq>({
    email: "admin@odonto.com",
    password: "Admin123!Admin123!",
  });

  const [token, setToken] = useState<string>(() => localStorage.getItem("ODONTO_TOKEN") ?? "");
  const tokenPayload = useMemo(() => (token ? decodeJwt(token) : null), [token]);

  const [out, setOut] = useState<string>("");

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<number | "">("");

  async function callJson(url: string, options?: RequestInit) {
    const res = await fetch(url, {
      headers: {
        "content-type": "application/json",
        ...(options?.headers ?? {}),
      },
      ...options,
    });

    const text = await res.text();
    const json = safeJsonParse(text);

    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}\n${text}`);
    }
    return json ?? text;
  }

  async function doBootstrap() {
    setOut("Bootstrapping...");
    try {
      const r = await callJson(`${IDENTITY_BASE}/auth/bootstrap`, {
        method: "POST",
        body: JSON.stringify(bootstrap),
      });

      // tu backend hoy devuelve accessToken
      const t = (r as any).accessToken as string | undefined;
      if (t) {
        localStorage.setItem("ODONTO_TOKEN", t);
        setToken(t);
        // cargar clínicas luego de tener token
        setTimeout(() => loadClinicsIntoState(t), 0);
      }

      setOut(JSON.stringify(r, null, 2));
    } catch (e: any) {
      setOut(String(e?.message ?? e));
    }
  }

  async function doLogin() {
    setOut("Logging in...");
    try {
      const r = await callJson(`${IDENTITY_BASE}/auth/login`, {
        method: "POST",
        body: JSON.stringify(login),
      });

      const t = ((r as any).accessToken ?? (r as any).token) as string | undefined;
      if (t) {
        localStorage.setItem("ODONTO_TOKEN", t);
        setToken(t);
        // cargar clínicas luego de tener token
        setTimeout(() => loadClinicsIntoState(t), 0);
      }

      setOut(JSON.stringify(r, null, 2));
    } catch (e: any) {
      setOut(String(e?.message ?? e));
    }
  }

  async function testAdminMe() {
    setOut("Calling admin /api/cash/me ...");
    try {
      if (!token) throw new Error("No hay token. Hacé login primero.");

      const r = await fetch(`${ADMIN_BASE}/api/cash/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await r.text();
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}\n${text}`);

      setOut(JSON.stringify(safeJsonParse(text) ?? text, null, 2));
    } catch (e: any) {
      setOut(String(e?.message ?? e));
    }
  }

  function logout() {
    localStorage.removeItem("ODONTO_TOKEN");
    setToken("");
    setClinics([]);
    setSelectedClinicId("");
    setOut("Token borrado.");
  }

  async function loadClinics(tokenOverride?: string) {
    const t = tokenOverride ?? token;
    const r = await fetch(`${IDENTITY_BASE}/api/clinics`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    const text = await r.text();
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}\n${text}`);
    return safeJsonParse(text) ?? [];
  }

  async function loadClinicsIntoState(tokenOverride?: string) {
    setOut("Cargando clínicas...");
    try {
      const list = (await loadClinics(tokenOverride)) as Clinic[];
      setClinics(list);

      const activeId = (tokenPayload as any)?.activeClinicId as number | undefined;
      if (activeId) {
        setSelectedClinicId(activeId);
      } else {
        setSelectedClinicId(list[0]?.id ?? "");
      }

      setOut(`Clínicas cargadas: ${list.length}`);
    } catch (e: any) {
      setOut(String(e?.message ?? e));
    }
  }

  async function doSwitchClinic() {
    if (!selectedClinicId) return;

    setOut("Cambiando clínica...");
    try {
      if (!token) throw new Error("No hay token. Hacé login primero.");

      const r = await fetch(`${IDENTITY_BASE}/auth/switch-clinic`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ clinicId: Number(selectedClinicId) }),
      });

      const text = await r.text();
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}\n${text}`);

      const data = safeJsonParse(text) ?? {};
      const newToken = (data as any).accessToken as string | undefined;
      if (!newToken) throw new Error("Respuesta sin accessToken");

      localStorage.setItem("ODONTO_TOKEN", newToken);
      setToken(newToken);

      setOut("OK: token actualizado con activeClinicId");
    } catch (e: any) {
      setOut(String(e?.message ?? e));
    }
  }

  return (
    <div style={{ maxWidth: 980, margin: "24px auto", padding: 16, fontFamily: "system-ui" }}>
      <h2>OdontoSuite – Dev Auth</h2>
      <p style={{ color: "#555" }}>
        Identity: <b>{IDENTITY_BASE}</b> · Admin: <b>{ADMIN_BASE}</b>
      </p>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
        {/* Bootstrap */}
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
          <h3>1) Bootstrap (crear clínica + admin)</h3>

          <label>Clinic Name</label>
          <input
            value={bootstrap.clinicName}
            onChange={(e) => setBootstrap({ ...bootstrap, clinicName: e.target.value })}
            style={{ width: "100%", padding: 10, margin: "6px 0 10px" }}
          />

          <label>Clinic Slug</label>
          <input
            value={bootstrap.clinicSlug}
            onChange={(e) => setBootstrap({ ...bootstrap, clinicSlug: e.target.value })}
            style={{ width: "100%", padding: 10, margin: "6px 0 10px" }}
          />

          <label>Admin Email</label>
          <input
            value={bootstrap.adminEmail}
            onChange={(e) => setBootstrap({ ...bootstrap, adminEmail: e.target.value })}
            style={{ width: "100%", padding: 10, margin: "6px 0 10px" }}
          />

          <label>Admin Password</label>
          <input
            type="password"
            value={bootstrap.adminPassword}
            onChange={(e) => setBootstrap({ ...bootstrap, adminPassword: e.target.value })}
            style={{ width: "100%", padding: 10, margin: "6px 0 10px" }}
          />

          <button onClick={doBootstrap} style={{ padding: "10px 14px" }}>
            Ejecutar bootstrap
          </button>
        </div>

        {/* Login */}
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
          <h3>2) Login</h3>

          <label>Email</label>
          <input
            value={login.email}
            onChange={(e) => setLogin({ ...login, email: e.target.value })}
            style={{ width: "100%", padding: 10, margin: "6px 0 10px" }}
          />

          <label>Password</label>
          <input
            type="password"
            value={login.password}
            onChange={(e) => setLogin({ ...login, password: e.target.value })}
            style={{ width: "100%", padding: 10, margin: "6px 0 10px" }}
          />

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={doLogin} style={{ padding: "10px 14px" }}>
              Login
            </button>
            <button onClick={logout} style={{ padding: "10px 14px" }}>
              Logout
            </button>
          </div>

          <div style={{ marginTop: 12 }}>
            <button onClick={testAdminMe} disabled={!token} style={{ padding: "10px 14px" }}>
              Probar admin-service: /api/cash/me
            </button>
          </div>

          {/* Dropdown clínicas */}
          <div style={{ marginTop: 12, borderTop: "1px solid #eee", paddingTop: 12 }}>
            <h4>Clínica activa</h4>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => loadClinicsIntoState()}
                disabled={!token}
                style={{ padding: "10px 14px" }}
              >
                Cargar clínicas
              </button>

              <select
                disabled={!token || clinics.length === 0}
                value={selectedClinicId}
                onChange={(e) => setSelectedClinicId(e.target.value ? Number(e.target.value) : "")}
                style={{ padding: 10, minWidth: 260 }}
              >
                <option value="">(seleccionar)</option>
                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.slug})
                  </option>
                ))}
              </select>

              <button
                onClick={doSwitchClinic}
                disabled={!token || !selectedClinicId}
                style={{ padding: "10px 14px" }}
              >
                Usar esta clínica
              </button>
            </div>

            <p style={{ color: "#666", marginTop: 8 }}>
              El token nuevo debe traer <code>activeClinicId</code> y <code>activeRole</code>. Luego probá{" "}
              <code>/api/cash/me</code>.
            </p>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
        <h3>Token actual</h3>
        <textarea value={token} readOnly style={{ width: "100%", height: 90 }} />
        <h4>Claims</h4>
        <pre style={{ background: "#f7f7f7", padding: 12, borderRadius: 8, overflow: "auto" }}>
          {JSON.stringify(tokenPayload, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
        <h3>Output</h3>
        <pre style={{ background: "#f7f7f7", padding: 12, borderRadius: 8, overflow: "auto" }}>
          {out}
        </pre>
      </div>
    </div>
  );
}
