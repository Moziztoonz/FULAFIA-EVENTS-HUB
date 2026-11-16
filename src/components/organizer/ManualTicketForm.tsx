"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { sendJson } from "@/lib/client";
import { Alert } from "../Alert";

export function ManualTicketForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const result = await sendJson<{ id: string }>(`/api/events/${eventId}/manual-tickets`, "POST", {
      attendeeName: formData.get("attendeeName"),
      attendeeEmail: formData.get("attendeeEmail"),
      attendeePhone: formData.get("attendeePhone"),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.data.error ?? "We could not issue this ticket.");
      return;
    }
    router.push(`/organizer/events/${eventId}/tickets/${result.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <div>
        <h2 className="text-lg font-semibold">Issue a manual ticket</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          When someone reserves through WhatsApp and pays you directly, enter their details here.
          Their confirmed ticket is added to your attendee list for check-in tracking.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="manual-attendee-name" className="label">Attendee name</label>
          <input
            id="manual-attendee-name"
            name="attendeeName"
            required
            minLength={3}
            maxLength={80}
            className="input"
            autoComplete="name"
          />
        </div>
        <div>
          <label htmlFor="manual-attendee-email" className="label">Email <span className="font-normal text-muted">(optional)</span></label>
          <input
            id="manual-attendee-email"
            name="attendeeEmail"
            type="email"
            maxLength={160}
            className="input"
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="manual-attendee-phone" className="label">Phone <span className="font-normal text-muted">(optional)</span></label>
          <input
            id="manual-attendee-phone"
            name="attendeePhone"
            type="tel"
            maxLength={30}
            className="input"
            autoComplete="tel"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">After issuing, open the ticket to download it or send it on WhatsApp.</p>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Issuing ticket…" : "Confirm payment & generate ticket"}
        </button>
      </div>
    </form>
  );
}
