import type { StoredUser, Ticket } from "./firebase/firebaseUtils";

export type ClientDirectoryEntry = {
  uid: string;
  name: string;
  email: string | null;
  phone: string;
  ticketCount: number;
};

/** Merge signed-up users and ticket-only clients for pickers and directories. */
export function buildClientDirectory(
  users: StoredUser[],
  tickets: Ticket[]
): ClientDirectoryEntry[] {
  const usersById = new Map(users.map((u) => [u.id, u]));
  const ticketsByUser = new Map<string, Ticket[]>();

  for (const t of tickets) {
    const arr = ticketsByUser.get(t.userId) ?? [];
    arr.push(t);
    ticketsByUser.set(t.userId, arr);
  }

  const uids = new Set<string>([
    ...usersById.keys(),
    ...ticketsByUser.keys(),
  ]);

  const clients: ClientDirectoryEntry[] = Array.from(uids).map((uid) => {
    const u = usersById.get(uid);
    const ts = ticketsByUser.get(uid) ?? [];
    const first = ts[0];
    return {
      uid,
      name:
        u?.displayName ||
        first?.userName ||
        u?.email ||
        first?.userEmail ||
        "Unknown client",
      email: u?.email || first?.userEmail || null,
      phone: u?.phone || "",
      ticketCount: ts.length,
    };
  });

  clients.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  return clients;
}
