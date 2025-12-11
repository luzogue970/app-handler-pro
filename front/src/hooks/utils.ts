
export const normalizeUrl = (u?: string) =>
  (u || "").replace(/\.git$/, "").replace(/\/+$/g, "").toLowerCase();

export function stringifyValues(obj: any, seen = new Set()): string {
  if (obj == null) return "";
  if (seen.has(obj)) return "";
  if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean") {
    return String(obj);
  }
  if (typeof obj !== "object") return "";
  seen.add(obj);
  let parts: string[] = [];
  if (Array.isArray(obj)) {
    for (const v of obj) parts.push(stringifyValues(v, seen));
  } else {
    for (const k of Object.keys(obj)) {
      parts.push(stringifyValues((obj as any)[k], seen));
    }
  }
  return parts.filter(Boolean).join(" ");
}

export function matchQueryByFields(repo: any, q: string, fields: string[]) {
  if (!q) return true;
  const t = q.trim().toLowerCase();
  if (!t) return true;
  return fields.some((f) => {
    const v = repo[f];
    return !!v && String(v).toLowerCase().includes(t);
  });
}
