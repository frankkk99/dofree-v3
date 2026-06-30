export type AdminHelpSection = {
  id: string;
  title: string;
  module: string;
  summary: string;
  steps: string[];
  tips?: string[];
  warnings?: string[];
};

export const adminHelpSections: AdminHelpSection[] = [
  {
    id: 'overview',
    title: 'ภาพรวมหลังบ้าน',
    module: 'Overview',
    summary:
      'ระบบหลังบ้านใช้สำหรับจัดการข้อมูลภาพยนตร์ ซีรีส์ ลิงก์รับชม หน้าแรก ผู้ใช้ สมาชิก แจ้งเตือน และการตรวจสอบสถานะต่าง ๆ ของเว็บ ควรแก้ไขข้อมูลอย่างระมัดระวัง และตรวจสอบผลลัพธ์หลังบันทึกทุกครั้ง',
    steps: [
      'เปิดหน้า Admin',
      'เลือก module ที่ต้องการจาก Topbar',
      'ตรวจสอบข้อมูลก่อนแก้ไข',
      'บันทึกข้อมูล',
      'กลับไปตรวจผลที่หน้าเว็บจริงหรือ Preview',
    ],
    warnings: ['ข้อมูลบางส่วนมีผลกับหน้าเว็บจริง ควรตรวจสอบก่อนและหลังบันทึกเสมอ'],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    module: 'Dashboard',
    summary:
      'Dashboard ใช้ดูภาพรวมของระบบ เช่น จำนวนคอนเทนต์ทั้งหมด รายการที่พร้อมรับชม รายการที่ยังไม่มีลิงก์ ผู้ใช้ สถานะระบบ และข้อมูล analytics ที่ระบบเก็บได้',
    steps: [
      'ใช้ดูภาพรวมก่อนเริ่มงาน',
      'ตรวจรายการที่ยังไม่มีลิงก์',
      'ดูคิวงานคะแนนสูงที่ควรเติมลิงก์ก่อน',
      'ตรวจสถานะระบบหรือ analytics',
    ],
    tips: ['ถ้าตัวเลขบางส่วนยังไม่แสดง แปลว่า table หรือ tracking ของส่วนนั้นอาจยังไม่ได้ตั้งค่าครบ'],
  },
  {
    id: 'content-catalog',
    title: 'Content Catalog',
    module: 'Content',
    summary:
      'Content Catalog ใช้ค้นหาและจัดการข้อมูลหนังหรือซีรีส์ในระบบ เช่น title, poster, status, provider, watch URL, trailer URL และ notes',
    steps: [
      'ใช้ช่องค้นหาหรือ filter เพื่อหารายการ',
      'กดการ์ดหรือปุ่มแก้ไข',
      'ตรวจข้อมูลเรื่อง',
      'เติมหรือแก้ไข Watch URL / Trailer URL',
      'กด Test เพื่อตรวจลิงก์',
      'กด Save เพื่อบันทึก',
    ],
    warnings: ['อย่าลบหรือเขียนทับลิงก์ที่ใช้งานได้แล้วโดยไม่ตรวจสอบก่อน'],
  },
  {
    id: 'movie-links',
    title: 'การเติมลิงก์หนัง',
    module: 'Content',
    summary:
      'การเติมลิงก์หนังควรทำจากรายการที่มีคะแนนสูงหรือมีความต้องการสูงก่อน เพื่อให้หน้าเว็บมีคอนเทนต์พร้อมรับชมที่มีคุณภาพ',
    steps: [
      'เปิด Content Catalog หรือ Queue ที่ต้องเติมลิงก์',
      'เลือกหนังที่ต้องการ',
      'ใส่ Watch URL',
      'ใส่ Trailer URL ถ้ามี',
      'เลือก Provider',
      'ตั้ง Status เป็นพร้อมเผยแพร่เมื่อข้อมูลถูกต้อง',
      'กด Save',
      'เปิดหน้าเว็บจริงเพื่อตรวจผล',
    ],
  },
  {
    id: 'episodes',
    title: 'การจัดการซีรีส์และตอน',
    module: 'Episodes',
    summary: 'ซีรีส์ควรจัดการแยกตาม Season และ Episode เพื่อให้ผู้ใช้เลือกตอนรับชมได้ถูกต้อง',
    steps: [
      'เปิดรายการซีรีส์ใน Content Catalog',
      'ไปที่ส่วน Episodes',
      'เพิ่มตอนใหม่หรือแก้ไขตอนเดิม',
      'ใส่ Season Number และ Episode Number ให้ถูกต้อง',
      'ใส่ Watch URL ของแต่ละตอน',
      'กด Test เพื่อตรวจลิงก์',
      'กด Save',
    ],
    warnings: ['ระวังการใส่เลข Season/Episode ผิด เพราะจะทำให้ผู้ใช้เลือกตอนผิด'],
  },
  {
    id: 'homepage',
    title: 'Homepage Manager',
    module: 'Homepage',
    summary:
      'Homepage Manager ใช้ควบคุมการแสดงผลหน้าแรก เช่น หมวดแนะนำ แถวคอนเทนต์ ลำดับ section และสถานะการแสดงผล',
    steps: [
      'เลือก section ที่ต้องการแก้ไข',
      'ตรวจชื่อ section และลำดับ',
      'เปิด/ปิดการแสดงผล',
      'บันทึก',
      'ตรวจหน้าแรกหลังบันทึก',
    ],
    tips: ['ควรจัดหน้าแรกให้หลากหลาย เช่น หนังใหม่ ซีรีส์ อนิเมะ เกาหลี ไทย แอ็กชัน สยองขวัญ และรายการพร้อมรับชม'],
  },
  {
    id: 'premium',
    title: 'Premium / Membership',
    module: 'Premium',
    summary:
      'Premium / Membership ใช้จัดการสิทธิ์หรือข้อความที่เกี่ยวข้องกับระบบสมาชิก หากระบบชำระเงินยังไม่สมบูรณ์ ควรเขียนข้อความให้ชัดเจนว่าเป็นสิทธิ์ที่เตรียมไว้หรือกำลังพัฒนา',
    steps: [
      'เปิด Premium Controls หรือหน้าสมาชิก',
      'ตรวจข้อความและสถานะสิทธิ์ก่อนแก้ไข',
      'ปรับเฉพาะค่าที่จำเป็น',
      'บันทึกและตรวจผลบนหน้าที่เกี่ยวข้อง',
    ],
    warnings: ['ห้ามเขียนข้อความขายสิทธิ์เกินจริง หากระบบยังไม่พร้อมใช้งานครบ'],
  },
  {
    id: 'users',
    title: 'Users & Roles',
    module: 'Users',
    summary: 'Users & Roles ใช้ดูผู้ใช้และบทบาท เช่น admin, viewer, premium หรือสถานะอื่น ๆ ของบัญชี',
    steps: [
      'ค้นหาผู้ใช้',
      'ตรวจ role ปัจจุบัน',
      'เปลี่ยน role เฉพาะเมื่อจำเป็น',
      'บันทึก',
      'ตรวจสอบว่าผู้ใช้ยังเข้าใช้งานได้ถูกต้อง',
    ],
    warnings: ['อย่าให้สิทธิ์ admin กับบัญชีที่ไม่จำเป็น'],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    module: 'Notifications',
    summary:
      'Notifications ใช้สร้างประกาศหรือแจ้งเตือนที่แสดงในปุ่มกระดิ่งหน้าบ้าน เช่น ประกาศระบบ หนังเข้าใหม่ โปรโมชั่น หรือแจ้งปัญหาที่แก้ไขแล้ว',
    steps: [
      'กดสร้างแจ้งเตือน',
      'ใส่ Title และ Message',
      'เลือก Type และ Audience',
      'ใส่ CTA หรือ Related Content ถ้ามี',
      'ตั้ง Publish At / Expires At ถ้าต้องการ',
      'กด Preview',
      'กด Save',
    ],
    warnings: ['อย่าสร้างแจ้งเตือนบ่อยเกินไป เพราะจะรบกวนผู้ใช้'],
  },
  {
    id: 'sync',
    title: 'Sync Center',
    module: 'Sync',
    summary:
      'Sync Center ใช้สำหรับดึงหรือรีเฟรช catalog จากแหล่งข้อมูล เช่น TMDB โดยควรใช้แบบ batch และ preview ก่อนรันจริงทุกครั้ง',
    steps: [
      'เลือก Sync Profile',
      'ตั้ง filter เช่น movie/tv, ปี, คะแนนขั้นต่ำ, จำนวนเป้าหมาย',
      'เปิด Dry Run หรือ Preview ก่อน',
      'ตรวจผลที่คาดว่าจะ insert/update/skip',
      'ค่อย Start Sync',
      'ตรวจ Progress และ Logs',
    ],
    warnings: [
      'ห้ามล้าง catalog จริงใน production โดยไม่ preview และ backup ก่อน',
      'ห้าม overwrite watch_url หรือข้อมูลที่แอดมินเติมเอง',
    ],
  },
  {
    id: 'audit',
    title: 'Audit / History',
    module: 'Audit',
    summary: 'Audit / History ใช้ตรวจประวัติการแก้ไขและช่วยติดตามว่าใครเปลี่ยนข้อมูลอะไร เมื่อไหร่',
    steps: [
      'เปิด Audit',
      'ค้นหาตาม module หรือรายการ',
      'ตรวจ action ที่เกิดขึ้น',
      'ใช้ข้อมูลนี้เพื่อตรวจสอบปัญหาหรือย้อนดูการแก้ไข',
    ],
  },
  {
    id: 'admin-safety',
    title: 'ข้อควรระวังสำหรับแอดมิน',
    module: 'Safety',
    summary:
      'ระบบหลังบ้านมีผลกับหน้าเว็บจริง ควรแก้ไขอย่างระมัดระวัง โดยเฉพาะข้อมูลลิงก์รับชม สถานะเผยแพร่ สิทธิ์ผู้ใช้ และการ sync catalog',
    steps: [
      'ตรวจข้อมูลก่อนบันทึกทุกครั้ง',
      'ใช้ Preview หรือ Test Link เมื่อมีให้ใช้งาน',
      'แก้ไขเฉพาะข้อมูลที่อยู่ในขอบเขตงาน',
      'ตรวจผลบนหน้าเว็บหลังบันทึก',
    ],
    warnings: [
      'ห้ามแก้ข้อมูล production ถ้าไม่แน่ใจ',
      'ห้ามลบข้อมูลจำนวนมากโดยไม่มี backup',
      'ห้ามใส่ secret หรือ token ลงในช่องข้อมูล',
      'ห้ามให้สิทธิ์ admin กับผู้ใช้ที่ไม่เกี่ยวข้อง',
      'ห้ามเผยแพร่ข้อความที่กล่าวเกินจริง',
    ],
  },
];

export const adminHelpModules = Array.from(new Set(adminHelpSections.map((section) => section.module)));
