import type { NotificationAdapter } from "./types";
export const consoleAdapter: NotificationAdapter = {
  async send(subject, text) {
    console.info(`[TickTrendFit notification] ${subject}\n${text}`);
  },
};
