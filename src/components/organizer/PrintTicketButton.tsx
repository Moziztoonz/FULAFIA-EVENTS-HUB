"use client";

import { Icon } from "../Icon";

export function PrintTicketButton() {
  return (
    <button type="button" className="btn btn-primary print-hidden" onClick={() => window.print()}>
      <Icon name="download" size={15} /> Print or save ticket
    </button>
  );
}
