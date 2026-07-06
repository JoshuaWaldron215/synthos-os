import type { TeamMessage } from "../types";

// Unread math for chat badges. A message counts when it's newer than the
// convo's last-read mark and wasn't sent by the viewer.

export function convoUnread(msgs: TeamMessage[] | undefined, lastRead: number, me: number): number {
  if (!msgs) return 0;
  let n = 0;
  for (const m of msgs) if ((m.at ?? 0) > lastRead && m.who !== me) n++;
  return n;
}

export function totalUnread(
  teamMsgs: Record<string, TeamMessage[]>,
  convoReads: Record<string, number>,
  me: number,
): number {
  let n = 0;
  for (const id of Object.keys(teamMsgs)) n += convoUnread(teamMsgs[id], convoReads[id] ?? 0, me);
  return n;
}
