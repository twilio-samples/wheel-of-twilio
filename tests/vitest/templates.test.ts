import { expect, test, describe, vi, beforeEach } from "vitest";

const { axiosGet, axiosPost } = vi.hoisted(() => ({
  axiosGet: vi.fn(),
  axiosPost: vi.fn(),
}));

vi.mock("axios", () => ({ default: { get: axiosGet, post: axiosPost } }));
// twilio.ts builds a real client at import time; the template code under test
// only talks to the Content API through axios.
vi.mock("twilio", () => ({ default: () => ({}) }));
vi.mock("twilio/lib/jwt/AccessToken", () => ({
  default: class {},
  SyncGrant: class {},
}));
vi.mock("@/app/settings", () => ({ getSettings: async () => ({}) }));

import {
  getTemplates,
  templateMatchesWedges,
} from "@/scripts/contentTemplates";
import { getTemplate } from "@/app/twilio";

function existing(name: string, sid: string, wedges: string[]) {
  const config = getTemplates(wedges).find((t) =>
    t.friendly_name.endsWith(`_${name}_en`),
  )!;
  return { ...config, sid };
}

describe("templateMatchesWedges", () => {
  const [askForBets] = getTemplates(["Java", "Python"]);

  test("matches the wedge list the template was built from", () => {
    expect(templateMatchesWedges(askForBets, ["Java", "Python"])).toBe(true);
  });

  test("rejects a different, reordered, or partial wedge list", () => {
    expect(templateMatchesWedges(askForBets, ["Ruby", "Go"])).toBe(false);
    expect(templateMatchesWedges(askForBets, ["Python", "Java"])).toBe(false);
    expect(templateMatchesWedges(askForBets, ["Java"])).toBe(false);
  });

  test("rejects templates without a list picker", () => {
    expect(
      templateMatchesWedges({ types: { "twilio/text": { body: "" } } }, [
        "Java",
      ]),
    ).toBe(false);
  });
});

describe("getTemplate", () => {
  beforeEach(() => {
    axiosPost.mockReset();
  });

  test("returns the template matching the current wedges, not just the newest by name", async () => {
    axiosGet.mockResolvedValueOnce({
      data: {
        contents: [
          // Newest first, as the Content API returns them
          existing("AskForBets", "HXstale", ["Python", "C Sharp"]),
          existing("AskForBets", "HXcurrent", ["Webhooks", "Flows"]),
        ],
        meta: { next_page_url: null },
      },
    });

    const template = await getTemplate("AskForBets", "de", [
      "Webhooks",
      "Flows",
    ]);

    expect(template.sid).toBe("HXcurrent");
    expect(axiosPost).not.toHaveBeenCalled();
  });

  test("creates a template once when none matches, then reuses it", async () => {
    axiosPost.mockImplementation(async (_url: string, config: any) => ({
      data: { ...config, sid: "HXnew" },
    }));

    const [first, second] = await Promise.all([
      getTemplate("InvalidBet", "en", ["Calling", "OTP"]),
      getTemplate("InvalidBet", "en", ["Calling", "OTP"]),
    ]);
    const third = await getTemplate("InvalidBet", "en", ["Calling", "OTP"]);

    expect(axiosPost).toHaveBeenCalledTimes(1);
    expect(
      axiosPost.mock.calls[0][1].types["twilio/list-picker"].items.map(
        (i: any) => i.item,
      ),
    ).toEqual(["Calling", "OTP"]);
    expect([first.sid, second.sid, third.sid]).toEqual([
      "HXnew",
      "HXnew",
      "HXnew",
    ]);
  });
});
