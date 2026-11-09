// Exclude the entire book, including chapter pages and every hadith-number alias.
const excludedBooks: Record<string, readonly number[]> = {
  bukhari: [56],
  muslim: [32],
  abudawud: [9],
};
export function isBookNoindex(collection: string, book: number | undefined): boolean {
  return book !== undefined && (excludedBooks[collection]?.includes(book) ?? false);
}
