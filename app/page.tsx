import { HomeExperienceV3 } from '@/components/home-experience-v3';
import { getCatalogHomePayload } from '@/lib/catalog-home';

export default async function HomePage() {
  const home = await getCatalogHomePayload();
  return <HomeExperienceV3 home={home} />;
}
