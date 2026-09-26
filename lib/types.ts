// Contract types shared by the UI and the API. Source of truth: docs/SPEC.md §6–7.

export type ServiceId =
  | "house_blessing"
  | "shop_blessing"
  | "memorial"
  | "vehicle_blessing"
  | "monk_chat"
  | "meditation";

export type Mode = "monk_comes" | "you_go";
export type Slot = "morning" | "afternoon" | "evening";
export type Language = "th" | "en" | "zh" | "ja" | "kham_mueang";
/** withdrawn: another temple already accepted the same outreach request. */
export type InviteStatus = "pending" | "accepted" | "declined" | "withdrawn";

export type Area =
  | "nimman"
  | "old_city"
  | "santitham"
  | "chang_khlan"
  | "ping_river"
  | "wat_ket"
  | "hang_dong"
  | "mae_rim"
  | "san_kamphaeng"
  | "doi_suthep"
  | "san_sai"
  | "saraphi";

export type Service = {
  id: ServiceId;
  name: string;
  nameThai: string;
  mode: Mode;
  durationMin: number;
  donationRange: [number, number];
  prepare: string[];
  thaiLine: string;
  /** slots this service is normally held in; the clarifier defaults to the first */
  preferredSlots?: Slot[];
  /** starter pill labels shown on the Ask screen */
  pills?: string[];
};

export type Temple = {
  id: string;
  name: string;
  nameThai: string;
  area: Area;
  lat: number;
  lng: number;
  address: string;
  notes?: string;
  /** seed coordinates are hand-entered and approximate (~200 m) */
  coordsApproximate?: boolean;
  /** P1 addendum: the temple office's own contacts; "public" = seeded by us from the web, unverified. */
  office?: OfficeContact;
};

export type OfficeContact = {
  /** LINE ID as published (not a Messaging API userId; we can never push to it). */
  lineId?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  source: "public" | "office";
  /** where a public contact was found, and what it is really for */
  sourceUrl?: string;
  note?: string;
};

export type DeliveryVia = "line" | "sms" | "manual" | "web";

export type Availability = { date: string; slots: Slot[] };

export type Monk = {
  id: string;
  name: string;
  nameThai: string;
  templeId: string;
  yearsOrdained: number;
  languages: Language[];
  services: ServiceId[];
  travels: boolean;
  bio: string;
  availability: Availability[];
  donationHint?: Partial<Record<ServiceId, [number, number]>>;
};

export type Invite = {
  code: string;
  deviceId: string;
  userId?: string | null;
  monkId: string;
  serviceId: ServiceId;
  date: string;
  slot: Slot;
  mode: Mode;
  address?: string;
  area?: Area;
  guests?: number;
  language: "en" | "th";
  donation: number;
  status: InviteStatus;
  createdAt: string;
  updatedAt: string;
  note?: string;
  /** P1: how the temple side was told, and which LINE user answered. */
  deliveredVia?: DeliveryVia;
  respondedBy?: string;
  respondedAt?: string;
  /** How the temple can reach the host; only sent to temples the host chose or asked us to contact. */
  hostContact?: HostContact;
  /** Outreach: invites sent to several temples for one host request; the first acceptance wins. */
  requestId?: string;
};

export type HostContact = { email: string; whatsapp?: string; lineId?: string; consentAt: string };

export type Extracted = {
  serviceId?: ServiceId;
  mode?: Mode;
  date?: string;
  slot?: Slot;
  area?: Area;
  language?: "en" | "th";
  guests?: number;
  freeText: string;
};

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ClarifyRequest = { messages: ChatMessage[]; context: Partial<Extracted> };
export type ClarifyResponse = {
  ready: boolean;
  question?: string;
  pills?: string[];
  extracted: Extracted;
};

export type MatchCard = {
  monkId: string;
  name: string;
  temple: string;
  distanceKm: number | null;
  languages: string[];
  nextSlot: { date: string; slot: string } | null;
  availableOnDate: boolean;
  donationRange: [number, number];
  why: string;
  score: number;
};

export type MatchRequest = { extracted: Extracted; location?: { lat: number; lng: number } };
export type MatchResponse = { matches: MatchCard[]; runnerUp?: MatchCard };

export type ConfirmationCard = {
  code: string;
  monkName: string;
  templeName: string;
  when: string;
  where: string;
  donation: number;
  prepare: string[];
  thaiLine: string;
  icsUrl: string;
};

export type CreateInviteRequest = {
  monkId: string;
  serviceId: ServiceId;
  date: string;
  slot: Slot;
  donation: number;
  address?: string;
  area?: Area;
  guests?: number;
  language: "en" | "th";
  deviceId: string;
  /** Path B (host invites a temple directly): contact shared with that temple, with consent. */
  contact?: { email?: string; whatsapp?: string; lineId?: string; consent?: boolean };
};

export type InviteResponse = { invite: Invite; card: ConfirmationCard };
