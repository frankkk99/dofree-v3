import { HomeExperience } from '@/components/home-experience';
import { getHomePayload } from '@/lib/tmdb';

export default async function HomePage() {
  const home = await getHomePayload();
  return <HomeExperience home={home} />;
}
