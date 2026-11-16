import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Icon } from "@/components/Icon";
import { PrintTicketButton } from "@/components/organizer/PrintTicketButton";
import { ManualTicketActions } from "@/components/organizer/ManualTicketActions";
import { getEventById } from "@/lib/events";
import { qrDataUrl } from "@/lib/qr";
import { getManualTicket } from "@/lib/ticketing";
import { requirePageUser } from "@/lib/page-auth";
import { formatDateLong, formatTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Issued ticket" };

export default async function IssuedTicketPage({
  params,
}: {
  params: Promise<{ id: string; ticketId: string }>;
}) {
  const { id, ticketId } = await params;
  const user = await requirePageUser(["organizer", "admin"], `/organizer/events/${id}`);
  const event = getEventById(id);
  if (!event) notFound();
  if (event.organizer_id !== user.id && user.role !== "admin") redirect("/organizer");

  const ticket = getManualTicket(id, ticketId, user);
  if (!ticket) notFound();
  const qr = await qrDataUrl(ticket.ticket_code, ticket.flyer_path);

  return (
    <div className="container-page max-w-3xl space-y-4 py-6 sm:py-9">
      <div className="flex flex-wrap items-center justify-between gap-3 print-hidden">
        <Link
          href={`/organizer/events/${id}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink"
        >
          <Icon name="chevronLeft" size={16} /> Back to event
        </Link>
        <PrintTicketButton />
      </div>

      <article className="overflow-hidden rounded-3xl border border-line bg-white shadow-sm print-ticket">
        <header className="bg-[linear-gradient(120deg,#0a5136,#0e6b45_55%,#167a53)] px-6 py-6 text-white sm:px-8">
          <p className="text-[0.65rem] font-bold tracking-[0.15em] text-white/70 uppercase">
            Campus Events · FULAFIA
          </p>
          <h1 className="mt-2 font-display text-2xl leading-tight text-white sm:text-3xl">{ticket.event_title}</h1>
          <p className="mt-2 text-sm text-white/85">
            {formatDateLong(ticket.event_date)} · {formatTime(ticket.start_time)} · {ticket.venue}
          </p>
        </header>

        <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:p-8">
          <div className="space-y-5">
            <section>
              <p className="text-[0.65rem] font-bold tracking-[0.12em] text-muted uppercase">Attendee</p>
              <p className="mt-1 text-xl font-semibold text-ink">{ticket.attendee_name}</p>
              {ticket.attendee_email && <p className="text-sm text-muted">{ticket.attendee_email}</p>}
              {ticket.attendee_phone && <p className="text-sm text-muted">{ticket.attendee_phone}</p>}
            </section>

            <div className="flex flex-wrap gap-2">
              <span className="chip badge-green">Payment confirmed</span>
              <span className="chip badge-neutral">Manual ticket</span>
              {ticket.checked_in_at && <span className="chip badge-blue">Already checked in</span>}
            </div>

            <p className="max-w-md text-sm leading-relaxed text-muted">
              The QR code is customized with this event&apos;s flyer. Print or save this page and
              provide it to the attendee; no email is sent automatically.
            </p>
          </div>

          <div className="flex flex-col items-center">
            <div className="rounded-2xl border border-line bg-white p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt={`Flyer-branded QR code for ticket ${ticket.ticket_code}`} width={240} height={240} className="h-60 w-60" />
            </div>
            <p className="mt-3 font-mono text-lg font-bold tracking-wider text-brand-dark">{ticket.ticket_code}</p>
            <p className="mt-0.5 text-center text-xs text-muted">
              {ticket.checked_in_at ? "Ticket already used" : "One entry · show at the entrance"}
            </p>
          </div>
        </div>
        <div className="border-t border-dashed border-line px-6 py-5 sm:px-8 print-hidden">
          <ManualTicketActions
            qrDataUrl={qr}
            ticketCode={ticket.ticket_code}
            attendeeName={ticket.attendee_name}
            attendeePhone={ticket.attendee_phone}
            eventTitle={ticket.event_title}
            eventDate={formatDateLong(ticket.event_date)}
            venue={ticket.venue}
          />
        </div>
      </article>
    </div>
  );
}
