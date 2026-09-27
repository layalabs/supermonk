// Profile photos for the fictional monks. Grokker generated one portrait per monk with Grok
// (2026-09-27, public/monks/<id>.jpg, 320 px); monks without one yet share a single Higgsfield
// portrait. Decorative: the name sits next to it everywhere. The tooltip keeps it honest that
// neither the photo nor the monk is real.
export const MONK_PHOTO = "/monks/face.jpg";
export const MONKS_WITH_PHOTO = new Set(Array.from({ length: 12 }, (_, i) => `monk_${String(i + 1).padStart(2, "0")}`));

export const monkPhotoSrc = (monkId: string) => (MONKS_WITH_PHOTO.has(monkId) ? `/monks/${monkId}.jpg` : MONK_PHOTO);

export default function MonkPhoto({ monkId }: { monkId: string }) {
  return <img src={monkPhotoSrc(monkId)} alt="" title="AI-generated photo · fictional monk" loading="lazy" decoding="async" className="h-full w-full object-cover" />;
}
