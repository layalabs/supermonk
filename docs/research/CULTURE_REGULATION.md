
# SuperMonk: culture, religion and regulation

Scope: constraints on an app that lets newcomers in Chiang Mai **invite** (นิมนต์) monks for house
blessings, shop openings, memorial merit, vehicle blessings, or monk chat, with a suggested donation
(ปัจจัย). Primary sources first (Vinaya, Sangha Act, มหาเถรสมาคม rules, PDPA text); newspapers
marked "(secondary)". Product spec this feeds: `PLANS/SUPERMONK_MVP_PLAN.md`.

**Headline:** the Vinaya and Thai Sangha rules make *the monk* the wrong counterparty for money, and
the 2025 scandals made *cash to individuals* the wrong pattern. The safe shape is: invitation goes to
the **temple office / abbot**, money goes to the **temple's bank account or ไวยาวัจกร**, the monk
receives only a **ใบปวารณา** (written pledge). The app must never appear to solicit (เรี่ยไร),
advertise monks, or set a price.

## 1. Vinaya, money, envelopes, stewards

| Point | Finding (year) | Source |
|---|---|---|
| Rule on money | NP 18: "Should any bhikkhu accept gold and silver, or have it accepted, or consent to its being deposited (near him), it is to be forfeited and confessed." Pātimokkha, tr. Thanissaro (2007) | [accesstoinsight NP 18](https://www.accesstoinsight.org/tipitaka/vin/sv/bhikkhu-pati.html) |
| Related rules | NP 19 (monetary exchange) and NP 20 (buying/selling) also forfeiture offences; NP 10 is the steward ("robe fund") procedure | same |
| What counts | Commentary extends "gold and silver" to modern currency; offence arises by accepting, having someone accept, or consenting to deposit "for you" without refusing | [BMC I, NP 18 (Thanissaro)](https://www.dhammatalks.org/vinaya/bmc/Section0014.html) |
| Steward route | Meṇḍaka allowance (Mahāvagga VI): a donor may leave money with a lay steward (kappiya-kāraka / veyyāvaccakara); the monk may accept allowable requisites bought with it, "but in no way whatsoever do I allow money to be accepted or searched for" | [Mahāvagga index](https://www.accesstoinsight.org/tipitaka/vin/mv/index.html); [Vinaya class: money](https://vinaya-class.github.io/13-money.html) |
| What a monk may say | A monk may say stewards exist but may **not** instruct the donor "give this to the steward"; that is "having it accepted" | [BMC I, NP 18](https://www.dhammatalks.org/vinaya/bmc/Section0014.html) |
| Thai lay practice | ปัจจัย is given as cash to the temple donation box or the ไวยาวัจกร; the monk is handed a **ใบปวารณา** on a receiving cloth stating the amount pledged | [dhamtara: ใบปวารณา](https://dhamtara.com/?p=26612); [trijeeworn guide](https://www.trijeeworn.com/products_detail/view/7846995) (secondary) |
| Who may legally receive on a monk's/temple's behalf | ไวยาวัจกร = "คฤหัสถ์ผู้ได้รับแต่งตั้งให้มีหน้าที่เบิกจ่ายนิตยภัต และมีอำนาจหน้าที่ดูแลรักษาทรัพย์สินของวัด"; chosen by the abbot with the resident Sangha, approved by the district ecclesiastical head; the abbot must delegate duties **in writing** (ข้อ 5) | [กฎ มส. ฉบับที่ 8 (พ.ศ. 2506)](https://www.watmoli.com/wittaya-one/1291/) |
| Legal status of that person | Sangha Act s.45 (1962): ecclesiastical office-holders and the lay treasurer (ไวยาวัจกร) "are deemed to be the official" under the Penal Code, so misuse of funds is s.147 embezzlement (5–20 yrs or life) | [Sangha Act EN, ONAB](https://onab.go.th/th/file/get/file/202106091ec316c8bb156d4d8775056abd2d434f112316.pdf); [Siam Center Law Group](https://siamcenterlawgroup.com/temple-fund-misappropriation-thailand-section-147/) (secondary) |
| Receipts | From 1 Jan 2026 a donation to a temple is tax-deductible only if made through the Revenue Department **e-Donation** system; ~43,000 of ~45,000 temples registered | [Nation, RD/ONAB e-Donation](https://www.nationthailand.com/news/general/40070921) (secondary); [Orbitax](https://orbitax.com/news/country/article/Thai-Notice-on-Donation-Deduct-59715) (secondary) |
| Temple accounts (2025) | SSC resolution 495/2568 (20 Jun 2025, effective 1 Oct 2025): account in the temple's name only, no individual's name; three authorised signatories, withdrawals need two incl. the abbot; monthly receipts/payments ledgers; annual report to ONAB by 20 Jan | [Nation on 495/2568](https://www.nationthailand.com/news/general/40070936) (secondary); [SSC 620/2568 index](https://mahathera.onab.go.th/index.php?url=mati&id=14607) (primary PDF link) |

**Product consequence:** the app's "donation" must be a pledge routed to the temple (bank/e-Donation/
office), shown to the monk as a ใบปวารณา-style note, never "pay the monk". No cash to individuals.

## 2. Sangha Act B.E. 2505 and amendments

| Point | Finding (year) | Source |
|---|---|---|
| Amendments | 2505 (1962); No. 2 B.E. 2535 (1992); No. 3 B.E. 2560 (2017); No. 4 B.E. 2561 (2018: King appoints Supreme Patriarch and SSC members; Gazette 17 Jul 2018) | [Royal Gazette No. 4/2561](https://www.ratchakitcha.soc.go.th/DATA/PDF/2561/A/050/T1.PDF); [Thai PBS](https://www.thaipbs.or.th/news/content/273430) (secondary) |
| Temple status | s.31: "วัดมีฐานะเป็นนิติบุคคล เจ้าอาวาสเป็นผู้แทนของวัดในกิจการทั่วไป" (1992 wording) — a temple is a juristic person and the abbot its agent | [Thai text, Wat Moli](https://www.watmoli.com/wittaya-one/1192/); [EN, ONAB](https://onab.go.th/th/file/get/file/202106091ec316c8bb156d4d8775056abd2d434f112316.pdf) |
| Abbot duties | s.37: keep the temple orderly, govern monks and laity there, teach, and "(4) ให้ความสะดวกตามสมควรในการบำเพ็ญกุศล" (reasonably facilitate merit-making) | same |
| Abbot powers | s.38: control who resides in the temple, expel, order work or apologies | same |
| SSC rule-making | s.15 ter: SSC may issue rules, orders, resolutions, announcements "not contradicting to law and doctrinal discipline" | same |
| Can a temple contract with a company? | Yes in principle: a juristic person acts through the abbot (s.31); temple property is "ecclesiastical property" (s.40) and land dealings are further regulated (SSC land regs 2567). No statute bars an MoU with a platform; the constraints are SSC orders on solicitation and finances (§3) | [ONAB SSC land regulation 2567](https://www.onab.go.th/th/content/category/detail/id/450/iid/78675); [Sangha Act EN](https://onab.go.th/th/file/get/file/202106091ec316c8bb156d4d8775056abd2d434f112316.pdf) |
| Invitation via intermediary | Nothing in the Act forbids it; in practice invitations go to the temple office/abbot, not the individual monk. Example policy: Wat Nyanavesakavan takes กิจนิมนต์ by office/email/LINE, ≥45 days ahead, ≤5 monks per event, ~5 events/week | [Wat Nyanaves กิจนิมนต์](https://www.watnyanaves.net/th/web_page/invitation) |
| Officials | s.45: administrative monks and ไวยาวัจกร are "officials" under the Penal Code (so bribery/embezzlement law applies) | Sangha Act EN, above |
| Pending change | After the 2025 scandals the SSC formed a committee to revise the Act (Jul 2025); government drafting a new Monastic Act with criminal penalties for monks breaking vows; ONAB tasked; "3–4 months" promised, not yet enacted as of this note | [Nation 14 Jul 2025](https://www.nationthailand.com/news/general/40052532) (secondary); [Bangkok Post 3068301](https://www.bangkokpost.com/thailand/general/3068301/sangha-act-to-be-revised-after-senior-monks-sex-scandals) (secondary, paywalled) |

## 3. SSC / ONAB rules on commerce, advertising, social media, apps

| Rule | Content (year) | Source |
|---|---|---|
| คำสั่ง มส. ควบคุมการเรี่ยไร พ.ศ. 2539 | ข้อ 5: "ห้ามมิให้วัดหรือพระภิกษุสามเณรทำการเรี่ยไร หรือมอบหมายหรือยินยอมให้ผู้อื่นทำการเรี่ยไร ทั้งโดยทางตรงและโดยทางอ้อม". เรี่ยไร includes sales/services presented as non-commercial, radio/TV announcements. Exceptions: inside temple grounds for annual/special merit events; outside only for construction with approvals | [Wat Moli text](https://www.watmoli.com/wittaya-one/1620/) |
| Control of Solicitation Act B.E. 2487 | Public solicitation needs a permit (Bangkok: Interior; provinces: นายอำเภอ); penalties small (≤200 THB / 1 month; coercive ≤1,000 THB / 1 yr); no rule yet on online drives | [ONAB Chiang Mai copy of Act](https://cmi.onab.go.th/th/content/category/detail/id/1688/iid/93641); [Dharmniti summary](https://www.dharmniti.co.th/knowledge-donation/) (secondary) |
| Amulet sales / ads | Oct 2017: Bangkok ecclesiastical governor, following an SSC order, banned amulet advertising signs and sales of sacred objects inside ubosots | [Khaosod](https://www.khaosod.co.th/special-stories/news_540476) (secondary); [Bangkok Post 1335363](https://www.bangkokpost.com/thailand/general/1335363/monks-told-to-stop-selling-holy-items-in-ubosots) (secondary) |
| Alms conduct | Jul–Aug 2020: SSC six rules: alms rounds end by 08:00, no standing at food shops, no alms from vehicles | [Thai PBS](https://www.thaipbs.or.th/news/content/295258) (secondary) |
| Fortune/lottery | SSC announcement 1 Sep 1955 bans monks predicting lottery numbers; reiterated Sep 2025 incl. via social media | [Thaiger](https://thethaiger.com/news/national/buddhist-council-bans-monks-from-acting-as-lottery-seers) (secondary) |
| Social media guideline (2025) | ONAB provincial guidance citing SSC: page admins appointed with abbot oversight; donations only to the temple account, never personal; e-Donation for tax receipts; no false info; "โพสต์อย่างมีสติ แชร์อย่างระมัดระวัง รับบริจาคให้โปร่งใส" | [Daily News](https://www.dailynews.co.th/articles/5810047/) (secondary) |
| Temple finance (2025) | SSC 13/2568 (20 May 2025): four resolutions — asset-management guidelines with MoF/Interior/NACC/police, external audit, full e-Donation, oversight task force; SSC 495/2568 (20 Jun 2025) account rules; SSC 620/2568 (30 Jul 2025) asset-management practice | [Thai PBS](https://www.thaipbs.or.th/news/content/352340) (secondary); [SSC 13/2568](https://www.mahathera.org/index.php?url=mati&id=14380); [SSC 620/2568](https://mahathera.onab.go.th/index.php?url=mati&id=14607) |
| Apps specifically | No SSC or ONAB rule found that names apps or online invitation platforms (searched มหาเถรสมาคม ประกาศ พระสงฆ์ โซเชียล / แอป). The binding constraints are the solicitation order, finance rules and "no personal accounts" guidance above | this note |

## 4. Past controversies relevant to "monks via app"

| Event | Date / outcome | Source |
|---|---|---|
| Delivery-app merit, Trang | 7 Jan 2020: Phra Itthiyawat, Wat Nikhom Prathip, posted that donors order foodpanda to the temple and get a blessing by video call; viral debate on whether merit is "the same" and on declining temple attendance; no sanction reported | [Thai PBS](https://www.thaipbs.or.th/news/content/287707); [Matichon](https://www.matichon.co.th/region/news_1870084); [Thairath](https://www.thairath.co.th/news/society/1741290) (all secondary) |
| Existing "invite monks" apps | "กิจนิมนต์" (Kit Nimon) app: funerals, chanting groups, inviting monks in one app; no reported controversy found | [kitnimon site](https://kitnimon.kittikornsan.workers.dev/) |
| Celebrity monk livestream | Sep 2021: Phra Maha Sompong and Phra Maha Praiwan summoned by House religion committee over a jokey Facebook livestream; format adjusted, not stopped | [Thai PBS World](https://www.thaipbsworld.com/world/two-celebrity-monks-face-house-committee-over-controversial-livestream-session) (secondary); [Bangkok Post 2177415](https://www.bangkokpost.com/thailand/politics/2177415/monks-in-hot-water-over-livestream) (secondary) |
| Commercialised merit | 2014 Bangkok Post special report "Making money over merit" on priced ceremonies and amulet trade | [Bangkok Post 427152](https://www.bangkokpost.com/thailand/special-reports/427152/making-money-over-merit) (secondary, paywalled) |
| Wat Rai Khing | May 2025: abbot disrobed 15 May; ~300m THB initially, later >800m THB alleged, tied to online gambling; 49 accounts vs 4 declared | [Wikipedia summary](https://en.wikipedia.org/wiki/2025_Thai_monk_scandal); [Bangkok Post 3031906](https://www.bangkokpost.com/thailand/general/3031906/supreme-patriarch-orders-clean-finance-at-temples-after-multi-billion-baht-scandal-between-abbot-and-woman) (secondary) |
| "Sika Golf" | Jul 2025: Wilawan Emsawat arrested 15 Jul; ~385m THB through her accounts over 3 yrs; 13 monks disrobed by late Jul; police background checks on ~300,000 monks announced | [Wikipedia](https://en.wikipedia.org/wiki/2025_Thai_monk_scandal); [Bangkok Post 3069532](https://www.bangkokpost.com/thailand/general/3069532/ninth-senior-monk-quits-in-golf-temple-scandal) (secondary) |
| Public trust | NIDA Poll 14–16 Jul 2025 (n=1,310): 58.4% less trust in monks; 68.55% faith in Buddhism unchanged; 80.76% strongly back criminal penalties for monks | [Asia News Network](https://asianews.network/survey-finds-thai-public-blames-monks-misconduct-for-buddhisms-decline/) (secondary) |
| Rule changes | Supreme Patriarch ordered transparent finances (May 2025); SSC 495/2568 account rules (Oct 2025); SSC committee to revise Sangha Act (Jul 2025); e-Donation-only deductions (Jan 2026); new Monastic Act still in draft | §3 above |
| Donation scale | NIDA estimate 54.4bn THB/yr temple donations (2018 data); 410bn THB in ~39,000 temple accounts | [Nation 40070936](https://www.nationthailand.com/news/general/40070936); [Nation 40052497](https://www.nationthailand.com/news/general/40052497) (secondary) |

## 5. Norms for foreigners

| Topic | Norm | Source |
|---|---|---|
| Word | นิมนต์ = invite a monk (never จ้าง/hire, never "book"); Royal Society note 27 May 2553 (2010) | [ORST](http://legacy.orst.go.th/?knowledges=%E0%B8%99%E0%B8%B4%E0%B8%A1%E0%B8%99%E0%B8%95%E0%B9%8C-%E0%B9%92%E0%B9%97-%E0%B8%9E%E0%B8%A4%E0%B8%A9%E0%B8%A0%E0%B8%B2%E0%B8%84%E0%B8%A1-%E0%B9%92%E0%B9%95%E0%B9%95%E0%B9%93) (host unreachable at check; title from search) |
| Number of monks | Odd number: 5, 7 or 9 (9 preferred, "progress"); condos often 5 | [NaYoo guide](https://nayoo.co/chiangrai/blogs/inviting-monks-for-house-blessing) (secondary) |
| Timing | Morning; meal offered before 11:00; two common starts ~07:30 and ~10:30 (เพล) | same; [Siam Chai Tent](https://siamchaitent.com/blog/housewarming-ceremony/) (secondary) |
| How to invite | Contact the **temple office** days ahead (Wat Nyanaves: ≥45 days); ฎีกานิมนต์ (written invitation) is the formal form | [Wat Nyanaves](https://www.watnyanaves.net/th/web_page/invitation); [CPD infographic](https://office.cpd.go.th/old-web/personnel/images/infographic/2022329142941-pa.pdf) |
| Prepare | Buddha image, incense/candles/flowers, สายสิญจน์ thread, holy-water bowl, seats (อาสนะ), food and drink, ปัจจัย envelopes per monk | NaYoo, above |
| ปัจจัย | Amount "ตามศรัทธา"; hand to temple office/ไวยาวัจกร or place ใบปวารณา on the receiving cloth | §1 sources |
| Women | Do not touch monks or hand items directly; place on the receiving cloth or pass via a man; kneel/lower when offering | [Temple Stairway](https://templestairway.com/blog/monk-chat-chiang-mai-meditation-retreat) (secondary); [Amazing Thailand](https://amazingthailand.com/don-t-touch-monks) (secondary) |
| Dress | Shoulders and knees covered; nothing tight; white loose clothes for overnight retreats | Temple Stairway, above |
| Vehicle blessing (เจิมรถ) | Usually done at the temple, morning; bring tray with 5 pairs incense/candles, garland, ดินสอพอง powder, gold leaf, ปัจจัย "ตามจิตศรัทธา"; one can also invite a nearby temple's monk | [autospinn](https://www.autospinn.com/2023/01/how-to-car-anointing-and-pray-homage-to-safe-driving-and-making-wealth-93393) (secondary) |
| Chiang Mai temples and foreigners | MCU Chiang Mai campus runs Monk Chat + Meditation Retreat at Wat Suan Dok (Mon–Fri 16:00–19:00; retreats half-day to 4 days; contact monkchat2023@gmail.com); Wat Chedi Luang monk chat since 1996 (Mahamakut Lanna campus), daily 09:00–18:00; Wat Umong Mon/Wed/Fri 17:30–19:30; all open to any religion, free or donation (2-day retreat 1,000 THB) | [monkchat.net (MCU)](https://www.monkchat.net/); [Chiang Mai Citylife](https://www.chiangmaicitylife.com/clg/our-city/monk-chat-lets-do-meditation/); [Big Boy Travel](https://www.bigboytravel.com/asia/thailand/chiangmai/monk-chat/) (secondary) |
| Disrespect to avoid | Pointing feet, sitting higher than monks, touching, photographing during chanting, offering food after noon, treating the event as a paid service | Temple Stairway; Amazing Thailand (secondary) |

No published evidence was found that Chiang Mai temples refuse foreign hosts; MCU/Monk Chat pages
show explicit outreach to foreigners. Whether a given temple sends monks to a condo is decided by
the abbot (s.37(4)), so the app should confirm per temple.

## 6. Data protection (PDPA B.E. 2562, in force 1 Jun 2022)

| Obligation | Text / rule | Source |
|---|---|---|
| Scope | s.5 ¶2: applies to a controller outside Thailand that offers goods/services to data subjects in Thailand "irrespective of whether the payment is made" | [Official EN translation (Gazette 27 May 2019)](https://www.dataguidance.com/sites/default/files/entranslation_of_the_personal_data_protection_act_0.pdf); [MDES copy](https://www.mdes.go.th/law/detail/1909-Personal-Data-Protection-Act--B-E--2562--2019-) |
| Sensitive data | s.26: "religious or philosophical beliefs" need **explicit consent**; the s.26(2) exemption covers non-profit religious bodies for their members, not a commercial app. An invite to a Buddhist blessing can reveal belief → treat as sensitive | same |
| Thai representative | s.37(5): a foreign controller under s.5 ¶2 must designate **in writing** a representative in Thailand "without any limitation of liability"; s.38 exempts only public bodies and controllers with no s.26 data and small volumes — SuperMonk holds s.26 data, so no exemption | same |
| Breach | s.37(4): notify the PDPC "within 72 hours" of awareness; notify subjects if high risk | same |
| Cross-border | s.28: destination must have adequate protection or an exception (consent, contract); 2023 sub-regulations add BCR/standard clauses | same; [DLA Piper TH](https://www.dlapiperdataprotection.com/index.html?t=law&c=TH) (secondary) |
| Penalties | s.79: sensitive-data misuse for gain: ≤1 yr / ≤1m THB (criminal); administrative fines up to 5m THB for sensitive-data breaches (ss.83–84) | same |
| Thai entity? | PDPA needs a Thai **representative**, not a Thai company. The Foreign Business Act B.E. 2542 (1999) treats a ≥50% foreign-held company as "foreign"; List 3 (21) "other service businesses" need a Foreign Business Licence; operating without one: 100,000–1,000,000 THB fine and/or ≤3 yrs | [thailaws.org FBA](https://www.thailaws.org/foreign-business-act/); [Siam Legal List 3](https://library.siam-legal.com/thai-law/foreign-business-act-types-of-businesses-list-3/) (secondary) |

Minimum for the MVP: consent screen naming "religious ceremony details" as sensitive data; store
addresses only until the event; Thai representative named before any real user; no card numbers.

## 7. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | Religious offence: app reads as hiring monks | High | High | Only นิมนต์/invite/ปัจจัย wording; show the ใบปวารณา flow; no "price", "fee", "book", star ratings; Thai review of every string |
| 2 | Vinaya breach optics: money "to the monk" | High | High | Pledge routed to temple account/office (SSC 495/2568); monk card never shows a THB figure as his; app text says "offered to the temple" |
| 3 | Solicitation (เรี่ยไร) breach by temple or app | Medium | High | App never asks users to give; donation is optional and user-initiated; no push notifications asking for money; no fundraising features |
| 4 | Monk exploitation / gig-economy framing | Medium | High | Abbot or office accepts on the temple's behalf (s.31, s.37(4)); no per-monk marketplace ranking by "earnings"; caps per Wat Nyanaves-style capacity |
| 5 | Fake monks / impersonation ([Penal Code s.208](https://radiothailand.prd.go.th/th/content/category/detail/id/57/iid/241767): ≤1 yr / ≤20,000 THB) | Medium | High | Onboard only via temple office with abbot sign-off; verify against ONAB temple registry; no self-registration of monks |
| 6 | Temple politics (abbot bypassed, wrong temple listed) | Medium | Medium | One temple-office contact per temple; written MoU; opt-in only; never list a temple without consent |
| 7 | PDPA: religious data without explicit consent, no Thai rep | High | Medium | s.26 explicit consent; s.37(5) representative; 72-h breach process; minimal retention |
| 8 | Foreign-operator restrictions (FBA List 3) | Medium | Medium | Hackathon demo has no revenue; before any fee, form Thai-majority entity or get FBL/BOI; do not take commissions on donations |
| 9 | Money handling: app seen as payment intermediary / unlicensed e-money | Medium | High | No payments in app (MVP already excludes); later use temple e-Donation QR only; never hold funds |
| 10 | Reputational risk with judges/locals post-2025 scandals (58.4% lost trust) | High | Medium | Lead pitch with transparency angle: pledges to temple accounts, audit trail, abbot control; cite SSC rules in the deck |
| 11 | Women/etiquette failures at events | Medium | Medium | Checklist card: receiving cloth, no touching, dress, food before 11:00; Thai line for the temple office |
| 12 | Timing/hygiene errors (afternoon invites, meat/alcohol) | Medium | Low | Slot picker limits ceremonies to morning; checklist forbids alcohol; suggests vegetarian-friendly food |

## Sources

- https://www.accesstoinsight.org/tipitaka/vin/sv/bhikkhu-pati.html
- https://www.accesstoinsight.org/tipitaka/vin/mv/index.html
- https://www.dhammatalks.org/vinaya/bmc/Section0014.html
- https://vinaya-class.github.io/13-money.html
- https://dhamtara.com/?p=26612
- https://www.trijeeworn.com/products_detail/view/7846995
- https://www.watmoli.com/wittaya-one/1291/
- https://www.watmoli.com/wittaya-one/1192/
- https://www.watmoli.com/wittaya-one/1620/
- https://onab.go.th/th/file/get/file/202106091ec316c8bb156d4d8775056abd2d434f112316.pdf
- https://www.ratchakitcha.soc.go.th/DATA/PDF/2561/A/050/T1.PDF
- https://www.thaipbs.or.th/news/content/273430
- https://www.onab.go.th/th/content/category/detail/id/450/iid/78675
- https://siamcenterlawgroup.com/temple-fund-misappropriation-thailand-section-147/
- https://www.watnyanaves.net/th/web_page/invitation
- https://www.nationthailand.com/news/general/40052532
- https://www.bangkokpost.com/thailand/general/3068301/sangha-act-to-be-revised-after-senior-monks-sex-scandals
- https://cmi.onab.go.th/th/content/category/detail/id/1688/iid/93641
- https://www.dharmniti.co.th/knowledge-donation/
- https://www.khaosod.co.th/special-stories/news_540476
- https://www.bangkokpost.com/thailand/general/1335363/monks-told-to-stop-selling-holy-items-in-ubosots
- https://www.thaipbs.or.th/news/content/295258
- https://thethaiger.com/news/national/buddhist-council-bans-monks-from-acting-as-lottery-seers
- https://www.dailynews.co.th/articles/5810047/
- https://www.thaipbs.or.th/news/content/352340
- https://www.mahathera.org/index.php?url=mati&id=14380
- https://mahathera.onab.go.th/index.php?url=mati&id=14607
- https://www.nationthailand.com/news/general/40070936
- https://www.nationthailand.com/news/general/40070921
- https://orbitax.com/news/country/article/Thai-Notice-on-Donation-Deduct-59715
- https://www.nationthailand.com/news/general/40052497
- https://www.thaipbs.or.th/news/content/287707
- https://www.matichon.co.th/region/news_1870084
- https://www.thairath.co.th/news/society/1741290
- https://kitnimon.kittikornsan.workers.dev/
- https://www.thaipbsworld.com/world/two-celebrity-monks-face-house-committee-over-controversial-livestream-session
- https://www.bangkokpost.com/thailand/politics/2177415/monks-in-hot-water-over-livestream
- https://www.bangkokpost.com/thailand/special-reports/427152/making-money-over-merit
- https://en.wikipedia.org/wiki/2025_Thai_monk_scandal
- https://www.bangkokpost.com/thailand/general/3031906/supreme-patriarch-orders-clean-finance-at-temples-after-multi-billion-baht-scandal-between-abbot-and-woman
- https://www.bangkokpost.com/thailand/general/3069532/ninth-senior-monk-quits-in-golf-temple-scandal
- https://asianews.network/survey-finds-thai-public-blames-monks-misconduct-for-buddhisms-decline/
- http://legacy.orst.go.th/?knowledges=%E0%B8%99%E0%B8%B4%E0%B8%A1%E0%B8%99%E0%B8%95%E0%B9%8C-%E0%B9%92%E0%B9%97-%E0%B8%9E%E0%B8%A4%E0%B8%A9%E0%B8%A0%E0%B8%B2%E0%B8%84%E0%B8%A1-%E0%B9%92%E0%B9%95%E0%B9%95%E0%B9%93
- https://nayoo.co/chiangrai/blogs/inviting-monks-for-house-blessing
- https://siamchaitent.com/blog/housewarming-ceremony/
- https://office.cpd.go.th/old-web/personnel/images/infographic/2022329142941-pa.pdf
- https://templestairway.com/blog/monk-chat-chiang-mai-meditation-retreat
- https://amazingthailand.com/don-t-touch-monks
- https://www.autospinn.com/2023/01/how-to-car-anointing-and-pray-homage-to-safe-driving-and-making-wealth-93393
- https://www.monkchat.net/
- https://www.chiangmaicitylife.com/clg/our-city/monk-chat-lets-do-meditation/
- https://www.bigboytravel.com/asia/thailand/chiangmai/monk-chat/
- https://www.dataguidance.com/sites/default/files/entranslation_of_the_personal_data_protection_act_0.pdf
- https://www.mdes.go.th/law/detail/1909-Personal-Data-Protection-Act--B-E--2562--2019-
- https://www.dlapiperdataprotection.com/index.html?t=law&c=TH
- https://www.thailaws.org/foreign-business-act/
- https://library.siam-legal.com/thai-law/foreign-business-act-types-of-businesses-list-3/
- https://radiothailand.prd.go.th/th/content/category/detail/id/57/iid/241767
