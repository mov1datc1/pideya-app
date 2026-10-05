export type GuideStage = 'location' | 'category' | 'store' | 'products' | 'cart' | 'checkout' | 'done';
export const GUIDE_STAGES: GuideStage[] = ['location', 'category', 'store', 'products', 'cart', 'checkout', 'done'];
export function nextGuideStage(current: GuideStage, achieved: GuideStage): GuideStage {
  return GUIDE_STAGES.indexOf(achieved) > GUIDE_STAGES.indexOf(current) ? achieved : current;
}
export function readGuideProgress(raw: string | null): { stage: GuideStage; hidden: boolean } {
  try {
    const value = JSON.parse(raw || '{}');
    return { stage: GUIDE_STAGES.includes(value.stage) ? value.stage : 'location', hidden: value.hidden === true };
  } catch { return { stage: 'location', hidden: false }; }
}
