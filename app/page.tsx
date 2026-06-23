import { HomeExperience } from '@/components/home-experience-windows';
import { getHomePayload } from '@/lib/tmdb';

export default async function HomePage() {
  const home = await getHomePayload();
  return <HomeExperience home={home} />;
}
