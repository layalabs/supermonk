// Thai copy for the temple side. Polite lay-to-Sangha register. Grokker reviews before launch.

export const TH = {
  greeting:
    "นมัสการครับ ยินดีต้อนรับสู่กิจนิมนต์ SuperMonk 🙏\nช่องทางนี้ช่วยให้ชาวต่างชาติในเชียงใหม่นิมนต์พระได้อย่างถูกต้อง\nกรุณาเลือกว่าท่านเป็นผู้ใด",
  roleOffice: "สำนักงานวัด", // quick-reply labels max 20 chars
  roleMonk: "พระภิกษุ",
  formLink: "กรุณากรอกข้อมูลสั้น ๆ (ประมาณ 2 นาที) ที่ลิงก์นี้",
  formDone: "บันทึกข้อมูลเรียบร้อยแล้วครับ เมื่อมีผู้นิมนต์ ระบบจะส่งรายละเอียดมาที่นี่",
  pendingTemple: "ข้อมูลของท่านรอสำนักงานวัดยืนยันครับ",
  accepted: "รับทราบครับ ได้แจ้งเจ้าภาพแล้วว่าท่านรับนิมนต์ 🙏",
  declined: "รับทราบครับ ได้แจ้งเจ้าภาพแล้วว่าไม่สะดวกในวันดังกล่าว",
  already: (status: string) => `กิจนิมนต์นี้ได้ตอบไว้แล้ว (${status === "accepted" ? "รับนิมนต์" : "ไม่สะดวก"})`,
  notFound: "ไม่พบกิจนิมนต์นี้ในระบบครับ",
  confirmed: (name: string) => `ยืนยัน ${name} เรียบร้อยครับ รับกิจนิมนต์ได้แล้ว`,
  notYourTemple: "บัญชีนี้ไม่ใช่สำนักงานของวัดนี้ครับ",
  notYours: "กิจนิมนต์นี้ไม่ได้ส่งถึงบัญชีนี้ครับ",
  cardTitle: "กิจนิมนต์ใหม่",
  accept: "รับนิมนต์",
  decline: "ไม่สะดวก",
  details: "ดูรายละเอียด",
  donation: (lo: number, hi: number) =>
    !hi
      ? "ปัจจัยตามกำลังศรัทธา"
      : lo === hi
        ? `ปัจจัยตามกำลังศรัทธา (ประมาณ ${hi.toLocaleString("th-TH")} บาท) ถวายแก่วัด`
        : `ปัจจัยตามกำลังศรัทธา (ประมาณ ${lo.toLocaleString("th-TH")}–${hi.toLocaleString("th-TH")} บาท) ถวายแก่วัด`,
  hostHome: "บ้านเจ้าภาพ (แจ้งที่อยู่เมื่อรับนิมนต์)",
  guests: (n: number) => `ผู้ร่วมงานประมาณ ${n} ท่าน`,
  hostLanguage: (lang: string) => (lang === "th" ? "เจ้าภาพพูดภาษาไทย" : "เจ้าภาพพูดภาษาอังกฤษ"),
} as const;
