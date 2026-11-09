export const collectionIconPresets = {
  bukhari: { title: 'Сахих аль-Бухари', symbol: 'خ', fontSize: 15 },
  muslim: { title: 'Сахих Муслим', symbol: 'م', fontSize: 15 },
  abudawud: { title: 'Сунан Абу Дауда', symbol: 'د', fontSize: 18 },
  tirmidhi: { title: 'Джами‘ ат-Тирмизи', symbol: 'ت', fontSize: 16 },
  nasai: { title: 'Сунан ан-Насаи', symbol: 'ن', fontSize: 16 },
  ibnmajah: { title: 'Сунан Ибн Маджа', symbol: 'جه', fontSize: 13 },
};

export const collectionSymbols: Record<string, string> = Object.fromEntries(
  Object.entries(collectionIconPresets).map(([id, preset]) => [id, preset.symbol]),
);
