import * as repo from "../../data/repo";
import type { Lead, LeadQuality, LeadSource, LeadStatus } from "../../types";
import type { StoreGet, StoreSet } from "../types";

// Outbound client CRM: leads with source, quality, pipeline status and
// follow-up dates. Every write goes through the repo (no-op in local mode).
export const createLeadsSlice = (set: StoreSet, get: StoreGet) => ({
  leads: [] as Lead[],
  fLeadStatus: "all",
  fLeadQuality: "all",
  fLeadDate: "all",

  setLeadFilter: (group: "status" | "quality" | "date", val: string) =>
    set(group === "status" ? { fLeadStatus: val } : group === "quality" ? { fLeadQuality: val } : { fLeadDate: val }),

  addLead: (input: {
    name: string;
    contact?: string;
    company?: string;
    website?: string;
    social?: string;
    email?: string;
    from?: LeadSource;
    quality?: LeadQuality;
    status?: LeadStatus;
    notes?: string;
    lastFollowUp?: number | null;
    nextFollowUp?: number | null;
    who?: number;
  }) => {
    const lead: Lead = {
      id: "ld" + Date.now() + Math.random().toString(36).slice(2, 5),
      name: input.name.trim(),
      contact: input.contact?.trim() ?? "",
      company: input.company?.trim() ?? "",
      website: input.website?.trim() ?? "",
      social: input.social?.trim() ?? "",
      email: input.email?.trim() ?? "",
      from: input.from ?? "outbound",
      quality: input.quality ?? "warm",
      status: input.status ?? "new",
      notes: input.notes?.trim() ?? "",
      lastFollowUp: input.lastFollowUp ?? null,
      nextFollowUp: input.nextFollowUp ?? null,
      who: input.who ?? get().currentUserId,
      createdAt: Date.now(),
    };
    set((s) => ({ leads: s.leads.concat(lead) }));
    repo.saveLead(lead).catch(get().syncCatch("lead write"));
    get().showToast("lead added ✦");
  },

  updateLead: (id: string, patch: Partial<Lead>) => {
    set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
    const updated = get().leads.find((l) => l.id === id);
    if (updated) repo.saveLead(updated).catch(get().syncCatch("lead write"));
  },

  deleteLead: (id: string) => {
    set((s) => ({ leads: s.leads.filter((l) => l.id !== id) }));
    repo.removeLead(id).catch(get().syncCatch("lead delete"));
    get().showToast("lead removed");
  },
});
