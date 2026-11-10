import { chapterSlug } from '../hadith/paths';
import type { ReviewTopic, ReviewItem } from './types';

export const topicsRoot = '/quran/topics';
export const topicBookPath = (topic: Pick<ReviewTopic, 'id' | 'title'>) => `${topicsRoot}/topic/${chapterSlug({ id: topic.id, title_ru: topic.title })}`;
export const topicChapterPath = (item: Pick<ReviewItem, 'id' | 'description'>) => `${topicsRoot}/chapter/${chapterSlug({ id: item.id, title_ru: item.description })}`;
