import { HomeExperienceV3 } from '@/components/home-experience-v3';
import { getHomePayload } from '@/lib/tmdb';

export default async function HomePage() {
  const home = await getHomePayload();
  return <HomeExperienceV3 home={home} />;
}
