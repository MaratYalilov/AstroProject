export function getSocialImagePath(title: string, subtitle?: string, subject?: string): string {
  const params = new URLSearchParams({ v: "2", title });
  if (subtitle) params.set("subtitle", subtitle);
  if (subject) params.set("subject", subject);
  return `/social-preview.png?${params}`;
}
