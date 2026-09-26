// Thai copy for the temple side. Polite lay-to-Sangha register, reviewed by Grokker 2026-09-26.
// House voice is ครับ on purpose (one voice for the account); นมัสการ only in monk-facing lines.

export const TH = {
  greeting:
    "สวัสดีครับ ยินดีต้อนรับสู่กิจนิมนต์ SuperMonk 🙏\nช่องทางนี้ช่วยให้ชาวต่างชาติในเชียงใหม่นิมนต์พระได้ตามธรรมเนียม\nกรุณาเลือกว่าท่านเป็นผู้ใด",
  roleOffice: "สำนักงานวัด", // quick-reply labels max 20 chars
  roleMonk: "พระภิกษุ",
  formLink: "กรุณากรอกข้อมูลสั้น ๆ (ประมาณ 2 นาที) ที่ลิงก์นี้",
  formDone: "บันทึกข้อมูลเรียบร้อยแล้วครับ เมื่อมีผู้นิมนต์ ระบบจะส่งรายละเอียดมาที่นี่",
  pendingTemple: "ข้อมูลของท่านรอสำนักงานวัดยืนยันครับ",
  accepted: "รับทราบครับ ได้แจ้งเจ้าภาพแล้วว่าท่านรับนิมนต์ 🙏",
  declined: "รับทราบครับ ได้แจ้งเจ้าภาพแล้วว่าไม่สะดวกในวันดังกล่าว",
  already: (status: string) =>
    status === "withdrawn" ? "เจ้าภาพได้พระจากวัดอื่นแล้วครับ ขอบพระคุณที่ตอบรับครับ 🙏" : `กิจนิมนต์นี้ได้ตอบไว้แล้ว (${status === "accepted" ? "รับนิมนต์" : "ไม่สะดวก"})`,
  // Invite modes: how the host can be reached directly, and a request another temple already took.
  hostContact: "ติดต่อเจ้าภาพ",
  filled: "เจ้าภาพได้พระจากวัดอื่นแล้วครับ ขอบพระคุณที่ตอบรับครับ 🙏",
  notFound: "ไม่พบกิจนิมนต์นี้ในระบบครับ",
  confirmAsk: (name: string) => `${name} ขอรับกิจนิมนต์ในนามวัดนี้ กรุณารับรองพระรูปนี้`,
  confirmButton: "รับรอง",
  confirmed: (name: string) => `รับรอง ${name} เรียบร้อยครับ รับกิจนิมนต์ได้แล้ว`,
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
  // P1 addendum: reaching a temple office through its own LINE or phone before it has added us.
  joinIntro: "สวัสดีครับ จากกิจนิมนต์ SuperMonk ช่องทางที่ช่วยให้ชาวต่างชาติในเชียงใหม่นิมนต์พระได้ตามธรรมเนียม",
  joinInvite: (temple: string, what: string) => `มีผู้ขอนิมนต์พระจาก${temple}: ${what}`,
  joinWeb: "ดูรายละเอียดและตอบรับทางเว็บ:",
  joinAdd: "หากสะดวกรับกิจนิมนต์ทาง LINE 1) เพิ่มเพื่อน:",
  joinLink: "2) แตะลิงก์นี้แล้วกดส่ง เพื่อเชื่อมบัญชีของวัด:",
  joinCommand: "เชื่อมบัญชีวัด", // prefilled chat text; the webhook parses it
  officeLinked: (temple: string) => `เชื่อมบัญชีนี้กับสำนักงาน${temple}เรียบร้อยครับ ต่อไปกิจนิมนต์จะส่งมาที่นี่ 🙏`,
  joinBad: "รหัสเชื่อมบัญชีไม่ถูกต้องครับ กรุณาแตะลิงก์จากข้อความเชิญอีกครั้ง",
  joinOtherTemple: "บัญชีนี้เชื่อมกับวัดอื่นไว้แล้วครับ",
  joinTaken: "วัดนี้มีบัญชีสำนักงานเชื่อมไว้แล้วครับ หากต้องการเปลี่ยน กรุณาติดต่อทีม SuperMonk",
  hostLanguage: (lang: string) => (lang === "th" ? "เจ้าภาพพูดภาษาไทย" : "เจ้าภาพพูดภาษาอังกฤษ"),
} as const;
