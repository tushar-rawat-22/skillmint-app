"use client";

/* eslint-disable react-hooks/set-state-in-effect -- The workspace fetch deliberately initializes server-owned persona and role-map state after mount. */

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { premiumEyebrow, premiumPrimaryCta, premiumSecondaryCta, premiumSurface } from "@/components/ui/premium";
import { ROUTES } from "@/constants/routes";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import type { AccountPersona, RecruiterRoleMap } from "../types";

type WorkspaceState = { ownerId: string | null; status: "loading" | "ready" | "error" | "signed_out"; persona: AccountPersona | null; maps: RecruiterRoleMap[]; message: string };

export default function RecruiterWorkspaceClient() {
  const { user, isLoading: isAuthLoading } = useAuthSession();
  const currentUserId = isAuthLoading ? undefined : user?.id ?? null;
  const activeOwnerRef = useRef<string | null | undefined>(currentUserId);
  const [state, setState] = useState<WorkspaceState>({ ownerId: null, status: "loading", persona: null, maps: [], message: "Loading recruiter workspace…" });
  const [roleTitle, setRoleTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (expectedUserId: string, signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/recruiter-evidence?expectedUserId=${encodeURIComponent(expectedUserId)}`, { credentials: "same-origin", cache: "no-store", signal });
      if (activeOwnerRef.current !== expectedUserId) return;
      if (response.status === 401) return setState({ ownerId: expectedUserId, status: "signed_out", persona: null, maps: [], message: "Log in before opening a recruiter workspace." });
      const body = await response.json() as { ownerId?: string; persona?: AccountPersona | null; roleMaps?: RecruiterRoleMap[] };
      if (!response.ok || body.ownerId !== expectedUserId || !Array.isArray(body.roleMaps)) throw new Error();
      setState({ ownerId: expectedUserId, status: "ready", persona: body.persona ?? null, maps: body.roleMaps, message: "" });
    } catch {
      if (signal?.aborted || activeOwnerRef.current !== expectedUserId) return;
      setState({ ownerId: expectedUserId, status: "error", persona: null, maps: [], message: "The recruiter workspace is unavailable in this environment." });
    }
  }, []);

  useEffect(() => { activeOwnerRef.current = currentUserId; }, [currentUserId]);

  useEffect(() => {
    if (currentUserId === undefined) {
      setState({ ownerId: null, status: "loading", persona: null, maps: [], message: "Loading recruiter workspace…" });
      return;
    }
    if (currentUserId === null) {
      setState({ ownerId: null, status: "signed_out", persona: null, maps: [], message: "Log in before opening a recruiter workspace." });
      setRoleTitle(""); setJobDescription(""); setSaving(false);
      return;
    }
    const controller = new AbortController();
    setState({ ownerId: currentUserId, status: "loading", persona: null, maps: [], message: "Loading recruiter workspace…" });
    setRoleTitle(""); setJobDescription(""); setSaving(false);
    void load(currentUserId, controller.signal);
    return () => controller.abort();
  }, [currentUserId, load]);

  async function setRecruiterPersona() {
    if (typeof currentUserId !== "string") return;
    const expectedUserId = currentUserId;
    setSaving(true);
    const result = await mutate({ action: "set_persona", expectedUserId, persona: "RECRUITER" });
    if (activeOwnerRef.current !== expectedUserId) return;
    setSaving(false);
    if (result.ok) void load(expectedUserId); else setState((current) => current.ownerId === expectedUserId ? { ...current, message: result.message } : current);
  }

  async function createRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (typeof currentUserId !== "string") return;
    const expectedUserId = currentUserId;
    setSaving(true);
    const result = await mutate({ action: "create_role_map", expectedUserId, roleTitle, jobDescription });
    if (activeOwnerRef.current !== expectedUserId) return;
    setSaving(false);
    if (!result.ok) return setState((current) => current.ownerId === expectedUserId ? { ...current, message: result.message } : current);
    setRoleTitle(""); setJobDescription(""); void load(expectedUserId);
  }

  if (currentUserId === undefined || (typeof currentUserId === "string" && state.ownerId !== currentUserId)) return <Status message="Loading recruiter workspace…" />;
  if (state.status === "loading") return <Status message={state.message} />;
  if (state.status === "signed_out") return <Status message={state.message} login />;
  if (state.status === "error") return <Status message={state.message} />;
  if (state.persona === "CANDIDATE") return <Status message="This account is set up as a candidate. Recruiter workspace actions require a separate recruiter persona so the two roles do not silently share authority." />;
  if (state.persona === null) return (
    <section className={premiumSurface}>
      <p className={premiumEyebrow}>Server-owned persona</p>
      <h2 className="mt-3 text-2xl font-black">Set up this account for recruiter evidence review</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">This selection is stored through a verified server route and cannot be changed from the browser database client. It does not verify identity, employer, or hiring authority.</p>
      <button type="button" disabled={saving} onClick={() => void setRecruiterPersona()} className={`${premiumPrimaryCta} mt-5 disabled:opacity-60`}>{saving ? "Setting up…" : "Use recruiter persona"}</button>
      {state.message ? <p role="alert" className="mt-3 text-sm text-rose-700">{state.message}</p> : null}
    </section>
  );

  return <div className="space-y-6">
    <section className={premiumSurface}>
      <p className={premiumEyebrow}>Role evidence map</p>
      <h2 className="mt-3 text-2xl font-black">Translate one role description into inspectable evidence requirements</h2>
      <form className="mt-6 space-y-4" onSubmit={createRole}>
        <label className="block text-sm font-bold">Role title<input required maxLength={120} value={roleTitle} onChange={(event) => setRoleTitle(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal" /></label>
        <label className="block text-sm font-bold">Job description<textarea required minLength={80} maxLength={12000} rows={9} value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal" /></label>
        <button disabled={saving} className={`${premiumPrimaryCta} disabled:opacity-60`}>{saving ? "Calculating…" : "Create evidence map"}</button>
      </form>
      {state.message ? <p role="alert" className="mt-3 text-sm text-rose-700">{state.message}</p> : null}
    </section>
    <section className={premiumSurface}>
      <h2 className="text-2xl font-black">Saved role maps</h2>
      <div className="mt-5 grid gap-4">{state.maps.length ? state.maps.map((map) => <article key={map.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><h3 className="font-black">{map.roleTitle}</h3><p className="mt-2 text-sm text-slate-600">{map.evidenceMap.summary}</p><ul className="mt-4 grid gap-2 text-sm md:grid-cols-2">{map.evidenceMap.categories.map((category) => <li key={category.key}><strong>{category.title}:</strong> {category.requirement}</li>)}</ul></article>) : <p className="text-sm text-slate-600">No role map yet. Create one before opening a candidate review.</p>}</div>
    </section>
  </div>;
}

async function mutate(body: unknown): Promise<{ ok: true } | { ok: false; message: string }> { try { const response = await fetch("/api/recruiter-evidence", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); return response.ok ? { ok: true } : { ok: false, message: response.status === 409 ? "That action conflicts with the current account or existing review state." : "The recruiter request could not be completed." }; } catch { return { ok: false, message: "The recruiter request could not reach the server." }; } }
function Status({ message, login = false }: { message: string; login?: boolean }) { return <section className={`${premiumSurface} text-center`}><p className={premiumEyebrow}>Recruiter workspace</p><h2 className="mt-3 text-2xl font-black">{message}</h2>{login ? <Link href={ROUTES.LOGIN} className={`${premiumSecondaryCta} mt-5`}>Log in</Link> : null}</section>; }
