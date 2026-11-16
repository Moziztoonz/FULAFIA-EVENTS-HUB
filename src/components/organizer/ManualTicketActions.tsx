"use client";

import { useState } from "react";
import { Alert } from "../Alert";
import { Icon } from "../Icon";

interface Props {
  qrDataUrl: string;
  ticketCode: string;
  attendeeName: string;
  attendeePhone: string | null;
  eventTitle: string;
  eventDate: string;
  venue: string;
}

export function ManualTicketActions(props: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function downloadTicket() {
    setBusy(true);
    setMessage(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 820;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not prepare the ticket image.");

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#0e6b45";
      context.fillRect(0, 0, canvas.width, 190);
      context.fillStyle = "#d9ebe1";
      context.font = "700 22px system-ui, sans-serif";
      context.fillText("CAMPUS EVENTS · FULAFIA", 64, 64);
      context.fillStyle = "#ffffff";
      context.font = "700 42px Georgia, serif";
      context.fillText(props.eventTitle, 64, 126, 1060);

      context.fillStyle = "#5c6b62";
      context.font = "700 20px system-ui, sans-serif";
      context.fillText("ATTENDEE", 64, 270);
      context.fillStyle = "#10241b";
      context.font = "700 34px system-ui, sans-serif";
      context.fillText(props.attendeeName, 64, 316, 530);

      context.fillStyle = "#5c6b62";
      context.font = "700 18px system-ui, sans-serif";
      context.fillText("DATE", 64, 390);
      context.fillText("VENUE", 64, 484);
      context.fillStyle = "#10241b";
      context.font = "500 24px system-ui, sans-serif";
      context.fillText(props.eventDate, 64, 426, 530);
      context.fillText(props.venue, 64, 520, 530);

      const qr = new Image();
      await new Promise<void>((resolve, reject) => {
        qr.onload = () => resolve();
        qr.onerror = () => reject(new Error("Could not load the ticket QR code."));
        qr.src = props.qrDataUrl;
      });
      context.fillStyle = "#ffffff";
      context.fillRect(680, 230, 420, 420);
      context.strokeStyle = "#dde6de";
      context.lineWidth = 3;
      context.strokeRect(680, 230, 420, 420);
      context.drawImage(qr, 700, 250, 380, 380);

      context.fillStyle = "#0a5136";
      context.font = "700 34px ui-monospace, monospace";
      context.textAlign = "center";
      context.fillText(props.ticketCode, 890, 710);
      context.fillStyle = "#5c6b62";
      context.font = "500 18px system-ui, sans-serif";
      context.fillText("Confirmed · one entry · show this QR at the gate", 890, 754);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Could not create the ticket image.");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `fulafia-ticket-${props.ticketCode}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      setMessage({ type: "success", text: "Ticket image downloaded. Attach it in the WhatsApp chat to the attendee." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Could not download the ticket image.",
      });
    } finally {
      setBusy(false);
    }
  }

  const phoneDigits = props.attendeePhone?.replace(/\D/g, "") ?? "";
  const whatsappNumber = phoneDigits.startsWith("0") ? `234${phoneDigits.slice(1)}` : phoneDigits;
  const whatsappMessage = encodeURIComponent(
    `Your payment for ${props.eventTitle} is confirmed. Your ticket number is ${props.ticketCode}. Please keep the attached ticket image and show its QR code at the entrance.`,
  );
  const whatsappHref =
    whatsappNumber.length >= 10 ? `https://wa.me/${whatsappNumber}?text=${whatsappMessage}` : null;

  return (
    <div className="space-y-3 print-hidden">
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" className="btn btn-primary" onClick={downloadTicket} disabled={busy}>
          <Icon name="download" size={16} /> {busy ? "Preparing ticket…" : "Download ticket image"}
        </button>
        {whatsappHref ? (
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
            Send message on WhatsApp
          </a>
        ) : (
          <span className="flex items-center text-xs text-muted">
            Add the attendee&apos;s phone number to send a WhatsApp message.
          </span>
        )}
      </div>
      {message && <Alert variant={message.type}>{message.text}</Alert>}
    </div>
  );
}
