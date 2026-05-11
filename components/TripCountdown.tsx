"use client";

import { getTripDaysLeft } from "@/lib/storage";

export function TripCountdown() {
  const days = getTripDaysLeft();
  const isUrgent = days <= 30;

  return (
    <div
      className={`mx-4 rounded-2xl p-4 flex items-center justify-between ${
        isUrgent ? "bg-gold/20 border border-gold trip-countdown-urgent" : "bg-surface"
      }`}
    >
      <div>
        <div className="font-syne font-bold text-gold text-2xl">{days}</div>
        <div className="font-dm text-cream/70 text-sm">days until Finland 🇫🇮</div>
      </div>
      <div className="text-right">
        <div className="font-syne font-bold text-cream text-sm">July 25, 2026</div>
        <div className="font-dm text-cream/50 text-xs mt-0.5">Oskari&apos;s family awaits</div>
      </div>
    </div>
  );
}
