// One AI-generated portrait (Higgsfield, 2026-09-27) stands in for every fictional monk's profile
// photo until each monk has their own; Stefan asked for one image, reused. Decorative: the name sits
// next to it everywhere. The tooltip keeps it honest that neither the photo nor the monk is real.
export const MONK_PHOTO = "/monks/face.jpg";

export default function MonkPhoto() {
  return <img src={MONK_PHOTO} alt="" title="AI-generated photo · fictional monk" loading="lazy" decoding="async" className="h-full w-full object-cover" />;
}
