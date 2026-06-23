# DOFree v3

DOFree v3 คือโครงเว็บหนัง / Movie Content Platform เวอร์ชันใหม่ที่เริ่มจากฐาน clean กว่า v2 โดยแยก public frontend, TMDB feed และ admin module ออกจากกันชัดเจนตั้งแต่ต้น

## เป้าหมาย v3

- ทำหน้าแรกโทนมืด cinematic ใกล้ mockup ที่ใช้เสนอขาย
- ใช้ TMDB แบบปลอดภัยผ่าน server env `TMDB_ACCESS_TOKEN`
- ถ้าไม่มี env ให้ fallback UI ยังทำงานและ build ผ่าน
- ยังไม่ผูก Supabase ใน public page เพื่อเลี่ยงปัญหา nullable client ตอน build
- เตรียมโครง SEO พื้นฐาน `robots` และ `sitemap`

## ENV

คัดลอกจาก `.env.example`

```bash
TMDB_ACCESS_TOKEN=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

สำหรับเฟสแรกจำเป็นจริง ๆ แค่ `TMDB_ACCESS_TOKEN` ถ้าไม่ใส่ เว็บจะใช้ข้อมูล fallback สำหรับ demo

## Run local

```bash
npm install
npm run dev
npm run build
```

## Roadmap

1. Public Home Cinematic UI
2. Movie Detail `/movie/[id]`
3. Watch-ready module
4. Admin CMS module
5. Supabase database + auth
6. Reports / Dashboard
7. SEO detail pages

## หมายเหตุเรื่องคอนเทนต์

ระบบนี้เป็นแพลตฟอร์มจัดการคอนเทนต์ วิดีโอ หรือภาพยนตร์ คอนเทนต์ที่เผยแพร่ควรเป็นคอนเทนต์ที่มีสิทธิ์ใช้งาน เช่น วิดีโอของลูกค้าเอง ตัวอย่าง หนังสั้น คอร์ส หรือไฟล์ที่ได้รับอนุญาต
