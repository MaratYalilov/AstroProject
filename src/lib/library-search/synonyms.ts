// Search-only variants. Never applied to displayed Quran text or hadith corpora.
export const nameVariants = [
  ['аййуб', 'айюб'], ['йусуф', 'юсуф'], ['йакуб', 'якуб'],
  ['йунус', 'юнус'], ['йахйа', 'яхья'], ['марйам', 'марьям'],
  ['хызр', 'хидр'], ['ибрахим', 'ибрагим'],
] as const;

// Whole-query editorial routes to existing descriptions, not new verse associations.
// Keep negated questions out: partial phrase substitution would lose their meaning.
export const descriptionAliases = [
  {
    itemId: 'topic-0414-item-002',
    queries: ['сохранение семьи', 'сохранить семью', 'как сохранить семью', 'примирение супругов', 'семейное примирение'],
    reason: 'В описании указателя собраны аяты о примирении при супружеском разладе.',
  },
] as const;
