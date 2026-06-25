export type BrowseRoute = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  keywords: string[];
};

export const browseRoutes: BrowseRoute[] = [
  {
    slug: 'watch-ready',
    eyebrow: 'Watch Ready',
    title: 'หนังและซีรีส์พร้อมรับชม',
    description: 'รวมหนังและซีรีส์ที่มีสถานะพร้อมรับชมบนดูดีดี พร้อมเลือกดูจากรายการที่มีลิงก์รับชมแล้ว',
    keywords: ['หนังพร้อมดู', 'ซีรีส์พร้อมดู', 'ดูหนัง HD'],
  },
  {
    slug: 'top-rated',
    eyebrow: 'Top Rated',
    title: 'หนังคะแนนสูง',
    description: 'คัดหนังและซีรีส์คะแนนดี เหมาะสำหรับคนที่อยากเลือกดูจากคุณภาพและความนิยม',
    keywords: ['หนังคะแนนสูง', 'หนังน่าดู', 'หนังยอดนิยม'],
  },
  {
    slug: 'popular',
    eyebrow: 'Popular',
    title: 'ยอดนิยมตอนนี้',
    description: 'รวมหนังและซีรีส์ยอดนิยมที่คนค้นหาและดูบ่อยบนดูดีดี',
    keywords: ['หนังยอดนิยม', 'ซีรีส์ยอดนิยม', 'หนังมาแรง'],
  },
  {
    slug: 'now-playing',
    eyebrow: 'New Movies',
    title: 'หนังใหม่',
    description: 'ติดตามหนังใหม่และรายการที่กำลังเข้าใหม่ พร้อมข้อมูลเรื่องย่อ คะแนน และตัวอย่าง',
    keywords: ['หนังใหม่', 'หนังเข้าใหม่', 'หนังใหม่ออนไลน์'],
  },
  {
    slug: 'series',
    eyebrow: 'Series',
    title: 'ซีรีส์น่าติดตาม',
    description: 'รวมซีรีส์ออนไลน์ ซีรีส์เกาหลี ซีรีส์ฝรั่ง และซีรีส์คะแนนดีที่น่าติดตาม',
    keywords: ['ซีรีส์ออนไลน์', 'ซีรีส์เกาหลี', 'ดูซีรีส์'],
  },
  {
    slug: 'thai',
    eyebrow: 'Thai Movies',
    title: 'หนังไทย',
    description: 'รวมหนังไทยและคอนเทนต์ภาษาไทยที่เหมาะกับผู้ชมในไทย',
    keywords: ['หนังไทย', 'ดูหนังไทย', 'หนังไทยออนไลน์'],
  },
  {
    slug: 'action',
    eyebrow: 'Action',
    title: 'หนังแอ็กชัน',
    description: 'หนังแอ็กชัน บู๊ ภารกิจ ไล่ล่า และฉากต่อสู้สำหรับคนชอบจังหวะเร็ว',
    keywords: ['หนังแอ็กชัน', 'หนังบู๊', 'หนังต่อสู้'],
  },
  {
    slug: 'horror',
    eyebrow: 'Horror',
    title: 'หนังสยองขวัญ',
    description: 'หนังผี หนังหลอน และหนังสยองขวัญสำหรับคนชอบความระทึก',
    keywords: ['หนังผี', 'หนังสยองขวัญ', 'หนังหลอน'],
  },
  {
    slug: 'comedy',
    eyebrow: 'Comedy',
    title: 'หนังตลก',
    description: 'หนังตลก คอมเมดี้ และหนังดูสบายสำหรับผ่อนคลาย',
    keywords: ['หนังตลก', 'หนังคอมเมดี้', 'หนังดูสบาย'],
  },
  {
    slug: 'romance',
    eyebrow: 'Romance',
    title: 'หนังโรแมนติก',
    description: 'หนังรัก โรแมนติก และเรื่องราวความสัมพันธ์ที่ดูง่าย',
    keywords: ['หนังรัก', 'หนังโรแมนติก', 'หนังความรัก'],
  },
];

export function browseRouteBySlug(slug: string) {
  return browseRoutes.find((route) => route.slug === slug);
}
