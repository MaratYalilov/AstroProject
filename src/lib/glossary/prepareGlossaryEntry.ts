// Server-only preparation for both the initial article and its static JSON endpoint.
import { buildGlossaryEntry } from "./glossaryPageData";
import { replaceQuranTags } from "../../utils/replaceQuranTags";

export function prepareGlossaryEntry(source: Parameters<typeof buildGlossaryEntry>[0]) {
  const entry = buildGlossaryEntry(source);
  return { ...entry, body: replaceQuranTags(entry.body) };
}
