export interface VerseNote {
  explanation: string;
  key_phrase: { text: string };
  basis: string;
  source_ids: string[];
  context_verse_keys?: string[];
  qualification?: string;
  usage_note?: string;
}

export interface ReviewItem {
  id: string;
  description: string;
  verse_keys: string[];
  verse_notes: Record<string, VerseNote>;
}

export interface ReviewTopic {
  id: string;
  title: string;
  aliases?: string[];
  scope_note?: string;
  see_also: string[];
  items: ReviewItem[];
}
