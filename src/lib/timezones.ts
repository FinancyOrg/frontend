const fallbackZones = [
  "UTC",
  "Europe/Berlin",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

export function ledgerTimezones(): string[] {
  try {
    const supported = Intl.supportedValuesOf("timeZone");
    if (supported.length > 0) {
      return supported;
    }
  } catch {
    // Older engines.
  }
  return fallbackZones;
}

export function guessTimezone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone) {
      return zone;
    }
  } catch {
    // Older engines.
  }
  return "Europe/Berlin";
}
