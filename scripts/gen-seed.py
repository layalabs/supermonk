#!/usr/bin/env python3
"""Generate SuperMonk demo seed data (fictional monks at real temples).

Deterministic: same output every run. Edit this file or data/seed.csv, never
monks.json by hand. `node scripts/import-seed.mjs` rebuilds monks.json from the CSV.
"""
import csv, json, random, datetime as dt, pathlib

random.seed(20260926)
ROOT = pathlib.Path(__file__).resolve().parent.parent / "data"
ROOT.mkdir(exist_ok=True)

# --- areas (centroids approximate, for distance when geolocation is denied) --------------
AREAS = {
    "nimman":        {"name": "Nimman",            "lat": 18.7995, "lng": 98.9673},
    "old_city":      {"name": "Old City",          "lat": 18.7883, "lng": 98.9853},
    "santitham":     {"name": "Santitham",         "lat": 18.8020, "lng": 98.9800},
    "chang_khlan":   {"name": "Chang Khlan / Night Bazaar", "lat": 18.7850, "lng": 98.9990},
    "ping_river":    {"name": "Ping River",        "lat": 18.7880, "lng": 99.0010},
    "wat_ket":       {"name": "Wat Ket",           "lat": 18.7930, "lng": 99.0040},
    "hang_dong":     {"name": "Hang Dong",         "lat": 18.6870, "lng": 98.9190},
    "mae_rim":       {"name": "Mae Rim",           "lat": 18.9160, "lng": 98.9430},
    "san_kamphaeng": {"name": "San Kamphaeng",     "lat": 18.7450, "lng": 99.1190},
    "doi_suthep":    {"name": "Doi Suthep",        "lat": 18.8048, "lng": 98.9217},
    "san_sai":       {"name": "San Sai",           "lat": 18.8530, "lng": 99.0100},
    "saraphi":       {"name": "Saraphi",           "lat": 18.7100, "lng": 99.0330},
}

# --- temples (real places, coordinates approximate to ~200 m, demo use only) ---------------
TEMPLES = [
    ("wat_chedi_luang", "Wat Chedi Luang", "วัดเจดีย์หลวง", "old_city", 18.7870, 98.9866, "103 Prapokklao Rd, Phra Sing"),
    ("wat_phra_singh", "Wat Phra Singh", "วัดพระสิงห์", "old_city", 18.7885, 98.9817, "2 Samlan Rd, Phra Sing"),
    ("wat_chiang_man", "Wat Chiang Man", "วัดเชียงมั่น", "old_city", 18.7935, 98.9893, "171 Ratchapakhinai Rd, Si Phum"),
    ("wat_phan_tao", "Wat Phan Tao", "วัดพันเตา", "old_city", 18.7874, 98.9873, "127/7 Prapokklao Rd, Phra Sing"),
    ("wat_lok_moli", "Wat Lok Moli", "วัดโลกโมฬี", "old_city", 18.7960, 98.9840, "Mani Nopparat Rd, Si Phum"),
    ("wat_suan_dok", "Wat Suan Dok", "วัดสวนดอก", "nimman", 18.7896, 98.9678, "139 Suthep Rd, Suthep"),
    ("wat_umong", "Wat Umong", "วัดอุโมงค์", "nimman", 18.7826, 98.9490, "135 Moo 10, Suthep"),
    ("wat_jed_yod", "Wat Jed Yod", "วัดเจ็ดยอด", "santitham", 18.8095, 98.9720, "Super Highway, Chang Phueak"),
    ("wat_ket_karam", "Wat Ket Karam", "วัดเกตการาม", "wat_ket", 18.7920, 99.0033, "96 Charoenrat Rd, Wat Ket"),
    ("wat_bupparam", "Wat Bupparam", "วัดบุพพาราม", "chang_khlan", 18.7877, 98.9973, "143 Tha Phae Rd, Chang Khlan"),
    ("wat_mahawan", "Wat Mahawan", "วัดมหาวัน", "chang_khlan", 18.7878, 98.9963, "Tha Phae Rd, Chang Khlan"),
    ("wat_saen_fang", "Wat Saen Fang", "วัดแสนฝาง", "chang_khlan", 18.7900, 98.9970, "Tha Phae Rd, Chang Moi"),
    ("wat_chetawan", "Wat Chetawan", "วัดเชตวัน", "chang_khlan", 18.7898, 98.9972, "Tha Phae Rd, Chang Moi"),
    ("wat_chai_mongkhon", "Wat Chai Mongkhon", "วัดชัยมงคล", "ping_river", 18.7810, 99.0030, "133 Charoen Prathet Rd, Chang Khlan"),
    ("wat_srisuphan", "Wat Srisuphan", "วัดศรีสุพรรณ", "old_city", 18.7797, 98.9873, "100 Wua Lai Rd, Hai Ya"),
    ("wat_doi_suthep", "Wat Phra That Doi Suthep", "วัดพระธาตุดอยสุเทพ", "doi_suthep", 18.8048, 98.9217, "Sriwichai Rd, Suthep"),
]

SERVICES = [
    {"id": "house_blessing", "name": "House / condo blessing", "nameThai": "ทำบุญขึ้นบ้านใหม่",
     "mode": "monk_comes", "durationMin": 90, "preferredSlots": ["morning"], "donationRange": [1000, 3000],
     "pills": ["Bless my new home"],
     "prepare": ["Clean the home, especially the entrance and the room where monks will sit",
                 "A low table with a white cloth for the Buddha image and offerings",
                 "Flowers, candles and incense (a temple shop sells a ready set)",
                 "A bowl of clean water for the holy water",
                 "Food for the monks, served before 11:00, and drinking water",
                 "An envelope with the donation (ปัจจัย), handed over at the end",
                 "Dress modestly: shoulders and knees covered, sit lower than the monks"],
     "thaiLine": "ขอนิมนต์{monkThai} จาก{templeThai} ไปทำบุญขึ้นบ้านใหม่ที่ {where} วันที่ {date} {slotThai}"},
    {"id": "shop_blessing", "name": "Shop / office opening blessing", "nameThai": "ทำบุญเปิดร้าน",
     "mode": "monk_comes", "durationMin": 90, "preferredSlots": ["morning"], "donationRange": [1000, 3000],
     "pills": ["Bless my new shop"],
     "prepare": ["Clean the shop and clear a space near the entrance for the monks",
                 "A low table with a white cloth, flowers, candles and incense",
                 "A bowl of clean water for the holy water",
                 "Food for the monks before 11:00, and drinking water",
                 "The owner and staff present, dressed modestly",
                 "An envelope with the donation (ปัจจัย)"],
     "thaiLine": "ขอนิมนต์{monkThai} จาก{templeThai} ไปทำบุญเปิดร้านที่ {where} วันที่ {date} {slotThai}"},
    {"id": "memorial", "name": "Memorial or merit-making at home", "nameThai": "ทำบุญอุทิศส่วนกุศล",
     "mode": "monk_comes", "durationMin": 60, "preferredSlots": ["morning", "afternoon"], "donationRange": [1000, 2000],
     "pills": ["Merit for someone I lost"],
     "prepare": ["A photo of the person, placed on a small table with flowers",
                 "An offering set (สังฆทาน) from any temple shop or supermarket",
                 "Food or drinks for the monks if before noon, drinks only after",
                 "An envelope with the donation (ปัจจัย)",
                 "Dress modestly, white or muted colours"],
     "thaiLine": "ขอนิมนต์{monkThai} จาก{templeThai} ไปทำบุญอุทิศส่วนกุศลที่ {where} วันที่ {date} {slotThai}"},
    {"id": "vehicle_blessing", "name": "Vehicle blessing (car or motorbike)", "nameThai": "เจิมรถ",
     "mode": "you_go", "durationMin": 20, "preferredSlots": ["morning"], "donationRange": [200, 500],
     "pills": ["Bless my car or bike"],
     "prepare": ["Bring the vehicle to the temple, cleaned",
                 "A small offering set or flowers, candles and incense",
                 "An envelope with the donation (ปัจจัย)",
                 "Arrive in the morning, dressed modestly"],
     "thaiLine": "ขอนิมนต์{monkThai} เจิมรถที่{templeThai} วันที่ {date} {slotThai}"},
    {"id": "monk_chat", "name": "Monk chat (conversation and culture)", "nameThai": "สนทนาธรรม",
     "mode": "you_go", "durationMin": 60, "preferredSlots": ["afternoon", "evening"], "donationRange": [0, 200],
     "pills": ["Talk with a monk"],
     "prepare": ["Shoulders and knees covered, shoes off inside the halls",
                 "Women do not touch monks or hand items directly to them; place items down first",
                 "Bring three questions; monks like practising English too",
                 "Phone on silent, and ask before taking photos",
                 "A donation is optional; 100 baht or more is customary"],
     "thaiLine": "ขอเข้าพบ{monkThai} ที่{templeThai} เพื่อสนทนาธรรม วันที่ {date} {slotThai}"},
    {"id": "meditation", "name": "Meditation guidance, one-on-one", "nameThai": "ฝึกสมาธิ",
     "mode": "you_go", "durationMin": 60, "preferredSlots": ["morning", "afternoon", "evening"], "donationRange": [0, 500],
     "pills": ["Learn to meditate"],
     "prepare": ["Loose, modest clothes in muted colours",
                 "Arrive 10 minutes early, shoes off, phone silent",
                 "Eat lightly beforehand",
                 "A donation is optional"],
     "thaiLine": "ขอเข้าพบ{monkThai} ที่{templeThai} เพื่อฝึกสมาธิ วันที่ {date} {slotThai}"},
]
SLOT_THAI = {"morning": "ช่วงเช้า", "afternoon": "ช่วงบ่าย", "evening": "ช่วงเย็น"}

GIVEN = [("Somchai", "สมชาย"), ("Somsak", "สมศักดิ์"), ("Anan", "อนันต์"), ("Wichai", "วิชัย"),
         ("Prasit", "ประสิทธิ์"), ("Narong", "ณรงค์"), ("Thawat", "ธวัช"), ("Kittipong", "กิตติพงษ์"),
         ("Chalerm", "เฉลิม"), ("Sarawut", "สราวุธ"), ("Nattapong", "ณัฐพงษ์"), ("Phichit", "พิชิต"),
         ("Manop", "มานพ"), ("Surin", "สุรินทร์"), ("Boonmee", "บุญมี"), ("Sombat", "สมบัติ"),
         ("Winai", "วินัย"), ("Thongchai", "ธงชัย"), ("Adisak", "อดิศักดิ์"), ("Kamon", "กมล")]
PALI = [("Thammawaro", "ธมฺมวโร"), ("Pannawuttho", "ปญฺญาวุฑฺโฒ"), ("Khemako", "เขมโก"),
        ("Santikaro", "สนฺติกโร"), ("Cittasamvaro", "จิตฺตสํวโร"), ("Sumedho", "สุเมโธ"),
        ("Thitadhammo", "ฐิตธมฺโม"), ("Aggavamso", "อคฺควํโส"), ("Kantasilo", "กนฺตสีโล"),
        ("Suddhacitto", "สุทฺธจิตฺโต"), ("Piyadhammo", "ปิยธมฺโม"), ("Sirindharo", "สิรินฺธโร"),
        ("Ariyawangso", "อริยวํโส"), ("Dhammadharo", "ธมฺมธโร"), ("Yasodharo", "ยโสธโร"),
        ("Kittisaro", "กิตฺติสาโร"), ("Vimalo", "วิมโล"), ("Jotiko", "โชติโก"),
        ("Nyanavaro", "ญาณวโร"), ("Sucitto", "สุจิตฺโต")]

START = dt.date(2026, 9, 26)
DAYS = [START + dt.timedelta(days=i) for i in range(14)]
DEMO_DATE = "2026-10-03"  # Saturday

def avail(pattern):
    """pattern: function(date) -> list of slots"""
    out = []
    for d in DAYS:
        slots = pattern(d)
        if slots:
            out.append({"date": d.isoformat(), "slots": slots})
    return out

def random_pattern(services):
    chat = any(s in ("monk_chat", "meditation") for s in services)
    def p(d):
        slots = []
        if random.random() < 0.55: slots.append("morning")
        if random.random() < 0.45: slots.append("afternoon")
        if chat and random.random() < 0.5: slots.append("evening")
        return slots
    return p

monks = []
def add(idx, temple, langs, services, travels, years, pattern, note=None):
    g, pl = GIVEN[idx % 20], PALI[(idx * 7 + idx // 20) % 20]
    m = {
        "id": f"monk_{idx+1:02d}",
        "name": f"Phra {g[0]} {pl[0]}",
        "nameThai": f"พระ{g[1]} {pl[1]}",
        "templeId": temple,
        "yearsOrdained": years,
        "languages": langs,
        "services": services,
        "travels": travels,
        "bio": "",
        "availability": avail(pattern),
    }
    if note: m["_note"] = note
    monks.append(m)

# --- the three monks that satisfy the stage demo (house_blessing + travels + English) --------
add(0, "wat_suan_dok", ["th", "en"], ["house_blessing", "shop_blessing", "monk_chat"], True, 14,
    lambda d: (["morning"] if d.weekday() in (1, 3, 5) else []) + (["evening"] if d.weekday() in (0, 2, 4) else []),
    "demo #1: available Sat morning, closest to Nimman")
add(1, "wat_ket_karam", ["th", "en", "kham_mueang"], ["house_blessing", "memorial", "meditation"], True, 22,
    lambda d: ["morning"] if d.weekday() in (2, 5, 6) else [],
    "demo #2: available Sat morning, Ping River side")
add(2, "wat_chedi_luang", ["th", "en", "zh"], ["house_blessing", "shop_blessing", "vehicle_blessing", "monk_chat"], True, 9,
    lambda d: (["morning"] if d.weekday() in (0, 3, 6) else []) + (["afternoon"] if d.weekday() in (1, 4) else []),
    "demo #3: NOT available Sat morning, next slot Sunday")

# --- everyone else: no other monk may be house_blessing + travels + en ----------------------
pool = [t[0] for t in TEMPLES]
i = 3
specs = []
# English speakers who do not travel (temple-side services)
for t in ["wat_suan_dok", "wat_umong", "wat_chedi_luang", "wat_phra_singh", "wat_srisuphan", "wat_bupparam",
          "wat_ket_karam", "wat_chai_mongkhon", "wat_doi_suthep", "wat_jed_yod", "wat_lok_moli", "wat_phan_tao"]:
    specs.append((t, ["th", "en"] + (["ja"] if random.random() < 0.2 else []),
                  random.sample(["monk_chat", "meditation", "vehicle_blessing"], k=random.choice([2, 3])), False))
# Thai-only monks who travel for ceremonies
for t in ["wat_chiang_man", "wat_mahawan", "wat_saen_fang", "wat_chetawan", "wat_chai_mongkhon", "wat_srisuphan",
          "wat_bupparam", "wat_phan_tao", "wat_lok_moli", "wat_ket_karam", "wat_suan_dok", "wat_umong"]:
    specs.append((t, ["th"] + (["kham_mueang"] if random.random() < 0.5 else []),
                  random.sample(["house_blessing", "shop_blessing", "memorial"], k=random.choice([2, 3])) + ["vehicle_blessing"], True))
# Mixed: English speakers who travel but do NOT do house blessings
for t in ["wat_jed_yod", "wat_doi_suthep", "wat_chiang_man", "wat_mahawan", "wat_saen_fang", "wat_chetawan", "wat_phra_singh"]:
    specs.append((t, ["th", "en"] + (["zh"] if random.random() < 0.3 else []),
                  random.sample(["shop_blessing", "memorial"], k=random.choice([1, 2])) + random.sample(["monk_chat", "meditation"], k=1), True))
# Thai-only temple-side
for t in ["wat_chedi_luang", "wat_phra_singh", "wat_umong", "wat_doi_suthep", "wat_jed_yod", "wat_saen_fang"]:
    specs.append((t, ["th"], random.sample(["vehicle_blessing", "meditation", "monk_chat"], k=2), False))

for t, langs, services, travels in specs:
    add(i, t, langs, sorted(set(services)), travels, random.randint(3, 30), random_pattern(services))
    i += 1

assert len(monks) == 40, len(monks)

# bios
tname = {t[0]: t[1] for t in TEMPLES}
LANG = {"th": "Thai", "en": "English", "zh": "Chinese", "ja": "Japanese", "kham_mueang": "Northern Thai (Kham Mueang)"}
SVC = {s["id"]: s["name"].lower() for s in SERVICES}
for m in monks:
    langs = ", ".join(LANG[l] for l in m["languages"])
    svcs = ", ".join(SVC[s] for s in m["services"])
    where = "and visits homes and shops across Chiang Mai" if m["travels"] else "and receives visitors at the temple"
    m["bio"] = f"Ordained {m['yearsOrdained']} years, based at {tname[m['templeId']]}. Speaks {langs}. Offers {svcs}, {where}."

# guard: exactly three house_blessing + travels + en
hb = [m for m in monks if "house_blessing" in m["services"] and m["travels"] and "en" in m["languages"]]
assert [m["id"] for m in hb] == ["monk_01", "monk_02", "monk_03"], [m["id"] for m in hb]
sat = [m["id"] for m in hb if any(a["date"] == DEMO_DATE and "morning" in a["slots"] for a in m["availability"])]
assert sat == ["monk_01", "monk_02"], sat

# --- write ---------------------------------------------------------------------------------
temples = [{"id": t[0], "name": t[1], "nameThai": t[2], "area": t[3], "lat": t[4], "lng": t[5], "address": t[6],
            "coordsApproximate": True} for t in TEMPLES]
(ROOT / "temples.json").write_text(json.dumps(temples, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
(ROOT / "areas.json").write_text(json.dumps(AREAS, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
(ROOT / "services.json").write_text(json.dumps({"slotThai": SLOT_THAI, "thaiReviewed": False, "services": SERVICES},
                                               ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
(ROOT / "monks.json").write_text(json.dumps(monks, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

with (ROOT / "seed.csv").open("w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["id", "name", "nameThai", "templeId", "yearsOrdained", "languages", "services", "travels", "bio", "availability", "note"])
    for m in monks:
        av = ";".join(f"{a['date']}:{'|'.join(a['slots'])}" for a in m["availability"])
        w.writerow([m["id"], m["name"], m["nameThai"], m["templeId"], m["yearsOrdained"], "|".join(m["languages"]),
                    "|".join(m["services"]), "true" if m["travels"] else "false", m["bio"], av, m.get("_note", "")])
print(f"wrote {len(temples)} temples, {len(monks)} monks, {len(SERVICES)} services")
