import meta from "@/data/meta.json";
import type { SeedData } from "@/lib/data";
import { AREA_CENTROIDS } from "@/lib/geo";
import { thaiDate } from "@/lib/invites";
import type { Invite, Slot } from "@/lib/types";
import { TH } from "./copy";
import type { LineMessage } from "./types";

export const POSTBACK = {
  accept: (code: string) => `accept:${code}`,
  decline: (code: string) => `decline:${code}`,
  role: (role: string) => `role:${role}`,
  confirm: (monkId: string) => `confirm:${monkId}`,
};

type PostbackAction = "accept" | "decline" | "role" | "confirm";
export function parsePostback(data: string): { action: PostbackAction; value: string } | null {
  const m = /^(accept|decline|role|confirm):([\w-]{1,40})$/.exec(data);
  return m ? { action: m[1] as PostbackAction, value: m[2] } : null;
}

/** Asks a temple office to confirm a monk who registered himself under that temple. */
export function confirmMonkMessage(monkName: string, monkId: string): LineMessage {
  return {
    type: "text",
    text: TH.confirmAsk(monkName),
    quickReply: {
      items: [{ type: "action", action: { type: "postback", label: TH.confirmButton, data: POSTBACK.confirm(monkId), displayText: TH.confirmButton } }],
    },
  };
}

const row = (label: string, value: string) => ({
  type: "box",
  layout: "baseline",
  spacing: "sm",
  contents: [
    { type: "text", text: label, color: "#8c8c8c", size: "sm", flex: 2 },
    { type: "text", text: value || "-", wrap: true, color: "#333333", size: "sm", flex: 5 },
  ],
});

/** Flex bubble for a new invite with รับนิมนต์ / ไม่สะดวก postback buttons. */
export function inviteFlex(invite: Invite, data: SeedData, baseUrl: string, hostName?: string): LineMessage {
  const service = data.services.find((s) => s.id === invite.serviceId);
  const monk = data.monks.find((m) => m.id === invite.monkId);
  const where =
    invite.mode === "monk_comes"
      ? invite.address ?? (invite.area ? AREA_CENTROIDS[invite.area]?.labelThai : undefined) ?? TH.hostHome
      : data.temples.find((t) => t.id === monk?.templeId)?.nameThai ?? "";
  const slotThai = (meta.slotThai as Record<Slot, string>)[invite.slot];
  const range = (monk?.donationHint?.[invite.serviceId] as [number, number] | undefined) ?? service?.donationRange ?? [0, 0];
  const details = [
    row("กิจ", service?.nameThai ?? invite.serviceId),
    row("พระ", monk?.nameThai ?? monk?.name ?? ""),
    row("วันที่", `${thaiDate(invite.date)} ${slotThai}`),
    row("สถานที่", where),
    row("เจ้าภาพ", [hostName, TH.hostLanguage(invite.language)].filter(Boolean).join(" · ")),
    ...(invite.guests ? [row("ผู้ร่วมงาน", TH.guests(invite.guests))] : []),
    row("ปัจจัย", TH.donation(invite.donation || range[0], invite.donation || range[1])),
  ];
  return {
    type: "flex",
    altText: `${TH.cardTitle}: ${service?.nameThai ?? ""} ${thaiDate(invite.date)}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#f5a623",
        contents: [
          { type: "text", text: TH.cardTitle, weight: "bold", color: "#0f1a2e", size: "lg" },
          { type: "text", text: invite.code, color: "#0f1a2e", size: "xs" },
        ],
      },
      body: { type: "box", layout: "vertical", spacing: "md", contents: details },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#2e7d4f",
            action: { type: "postback", label: TH.accept, data: POSTBACK.accept(invite.code), displayText: TH.accept },
          },
          {
            type: "button",
            style: "secondary",
            action: { type: "postback", label: TH.decline, data: POSTBACK.decline(invite.code), displayText: TH.decline },
          },
          { type: "button", style: "link", action: { type: "uri", label: TH.details, uri: `${baseUrl}/office?code=${invite.code}` } },
        ],
      },
    },
  };
}

export function roleQuestion(): LineMessage {
  return {
    type: "text",
    text: TH.greeting,
    quickReply: {
      items: (["office", "monk"] as const).map((r) => ({
        type: "action",
        action: { type: "postback", label: r === "office" ? TH.roleOffice : TH.roleMonk, data: POSTBACK.role(r), displayText: r === "office" ? TH.roleOffice : TH.roleMonk },
      })),
    },
  };
}
