import { describe, expect, it } from "vitest";
import { activityCountsByDate, indexRecordsByDate, sleepWaterBuckets } from "@/lib/records-index";
import { recordsOn, type AppData, type Entry } from "@/lib/store";

const data = {
  appointments: [
    { id: "a1", date: "2026-11-21", time: "15:00" },
    { id: "a2", date: "2026-11-21", time: "09:00" },
    { id: "a3", date: "2026-11-22", time: "10:00" },
  ],
  entries: [
    { id: "e1", date: "2026-11-21", time: "23:00", type: "sono", value: 7 },
    { id: "e2", date: "2026-11-21", time: "08:00", type: "agua", value: 2 },
    { id: "e3", date: "2026-11-21", time: "12:00", type: "agua" },
    { id: "e4", date: "2026-10-30", time: "22:00", type: "sono", value: 8 },
  ],
  habits: [{ id: "h1", date: "2026-11-21", time: "07:00", name: "Ler", kind: "pontual", note: "" }],
} as unknown as AppData;

describe("Índices de registros", () => {
  it("agrupa por data com o mesmo resultado e ordem de recordsOn", () => {
    const index = indexRecordsByDate(data);
    for (const date of ["2026-11-21", "2026-11-22", "2026-10-30", "2000-01-01"]) {
      expect(index.get(date) ?? { appointments: [], entries: [], habits: [] }).toEqual(recordsOn(data, date));
    }
  });
  it("conta registros por data", () => {
    const counts = activityCountsByDate(data);
    expect(counts.get("2026-11-21")).toBe(6);
    expect(counts.get("2026-11-22")).toBe(1);
    expect(counts.get("2026-11-23")).toBeUndefined();
  });
  it("soma sono e água por dia ou por mês; copo sem valor vale 1", () => {
    const entries = data.entries as Entry[];
    expect(sleepWaterBuckets(entries, (d) => d).get("2026-11-21")).toEqual({ sleepSum: 7, sleepCount: 1, water: 3 });
    expect(sleepWaterBuckets(entries, (d) => d.slice(0, 7)).get("2026-11")).toEqual({ sleepSum: 7, sleepCount: 1, water: 3 });
    expect(sleepWaterBuckets(entries, (d) => d.slice(0, 7)).get("2026-10")).toEqual({ sleepSum: 8, sleepCount: 1, water: 0 });
  });
});
