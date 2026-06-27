'use client';

// DetailWindow already opens on the recommendation tab by default and resets to
// recommendations when a new movie is selected. This component remains mounted
// for compatibility with the existing page wiring, but it intentionally does not
// force-click tabs after render. Forcing tab clicks was preventing users from
// opening นักแสดง / รายละเอียด / สปอยหนัง normally.
export function ModalRecommendationDefault() {
  return null;
}
