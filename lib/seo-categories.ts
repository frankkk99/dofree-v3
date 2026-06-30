export type SeoCategory = {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
};

export const seoCategories: SeoCategory[] = [
  {
    slug: 'action',
    title: 'หนังแอ็กชัน',
    description: 'รวมภาพยนตร์แอ็กชัน จังหวะเร็ว ฉากต่อสู้ และเรื่องราวเข้มข้นสำหรับค้นหาในดูดีดี.online',
    keywords: ['หนังแอ็กชัน', 'action movies', 'หนังต่อสู้'],
  },
  {
    slug: 'horror',
    title: 'หนังสยองขวัญ',
    description: 'รวมหนังสยองขวัญ ระทึกขวัญ และเรื่องลี้ลับสำหรับผู้ชมที่ชอบบรรยากาศเข้มข้น',
    keywords: ['หนังสยองขวัญ', 'horror movies', 'หนังผี'],
  },
  {
    slug: 'romance',
    title: 'หนังโรแมนติก',
    description: 'รวมหนังรัก หนังโรแมนติก และซีรีส์ความสัมพันธ์ที่ค้นหาได้ง่ายบนดูดีดี.online',
    keywords: ['หนังรัก', 'romance', 'โรแมนติก'],
  },
  {
    slug: 'comedy',
    title: 'หนังคอมเมดี้',
    description: 'หมวดหนังตลกและคอมเมดี้สำหรับผู้ชมที่ต้องการคอนเทนต์ดูง่ายและผ่อนคลาย',
    keywords: ['หนังตลก', 'comedy movies', 'คอมเมดี้'],
  },
  {
    slug: 'anime',
    title: 'อนิเมะ',
    description: 'หมวดอนิเมะและแอนิเมชันยอดนิยม พร้อมข้อมูลเรื่องย่อ ตัวอย่าง และรายการแนะนำ',
    keywords: ['อนิเมะ', 'anime', 'animation'],
  },
  {
    slug: 'korea',
    title: 'หนังและซีรีส์เกาหลี',
    description: 'รวมคอนเทนต์เกาหลี ซีรีส์เกาหลี และภาพยนตร์เกาหลีที่กำลังได้รับความนิยม',
    keywords: ['ซีรีส์เกาหลี', 'หนังเกาหลี', 'korean drama'],
  },
  {
    slug: 'thai',
    title: 'หนังและซีรีส์ไทย',
    description: 'รวมภาพยนตร์ไทย ซีรีส์ไทย และคอนเทนต์ภาษาไทยสำหรับผู้ชมในประเทศ',
    keywords: ['หนังไทย', 'ซีรีส์ไทย', 'thai movies'],
  },
  {
    slug: 'marvel',
    title: 'Marvel',
    description: 'รวมคอนเทนต์แนวซูเปอร์ฮีโร่และภาพยนตร์ที่เกี่ยวข้องกับจักรวาล Marvel',
    keywords: ['Marvel', 'ซูเปอร์ฮีโร่', 'superhero movies'],
  },
  {
    slug: 'dc',
    title: 'DC',
    description: 'รวมภาพยนตร์และซีรีส์แนวซูเปอร์ฮีโร่ที่เกี่ยวข้องกับ DC และตัวละครยอดนิยม',
    keywords: ['DC', 'ซูเปอร์ฮีโร่', 'dc movies'],
  },
  {
    slug: 'disney',
    title: 'Disney',
    description: 'หมวดคอนเทนต์ครอบครัว แอนิเมชัน และภาพยนตร์ยอดนิยมในสไตล์ Disney',
    keywords: ['Disney', 'หนังครอบครัว', 'animation'],
  },
  {
    slug: 'netflix',
    title: 'Netflix Style',
    description: 'หมวดคอนเทนต์ยอดนิยมและซีรีส์ที่ผู้ชมค้นหาในสไตล์ Netflix บนดูดีดี.online',
    keywords: ['Netflix', 'ซีรีส์ยอดนิยม', 'หนังยอดนิยม'],
  },
  {
    slug: 'apple',
    title: 'Apple TV Style',
    description: 'หมวดซีรีส์และภาพยนตร์คุณภาพสูงในสไตล์ Apple TV สำหรับจัดหมวด SEO ในอนาคต',
    keywords: ['Apple TV', 'ซีรีส์คุณภาพ', 'original series'],
  },
  {
    slug: 'prime',
    title: 'Prime Video Style',
    description: 'หมวดภาพยนตร์และซีรีส์ยอดนิยมในสไตล์ Prime Video สำหรับการจัดกลุ่มคอนเทนต์',
    keywords: ['Prime Video', 'หนังยอดนิยม', 'ซีรีส์ยอดนิยม'],
  },
  {
    slug: 'hbo',
    title: 'HBO / Max Style',
    description: 'หมวดซีรีส์และภาพยนตร์โทนพรีเมียมในสไตล์ HBO และ Max สำหรับ SEO รอบถัดไป',
    keywords: ['HBO', 'Max', 'premium series'],
  },
];
