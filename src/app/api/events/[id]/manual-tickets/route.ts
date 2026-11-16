import { json, readJson, requireUser, route } from "@/lib/api";
import { createManualTicket } from "@/lib/ticketing";
import { manualTicketSchema } from "@/lib/validation";

export const POST = route(async (request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const user = await requireUser(["organizer", "admin"]);
  const input = manualTicketSchema.parse(await readJson(request));
  const ticket = createManualTicket(user, id, input);
  return json({ ok: true, id: ticket.id, ticketCode: ticket.ticket_code }, 201);
});
