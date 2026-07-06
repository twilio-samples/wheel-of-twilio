import { fetchSegmentTraits } from "@/app/twilio";

export interface SegmentData {
  foundInSegment: boolean;
  [trait: string]: unknown;
}

export async function checkSegmentTraits(email: string | undefined): Promise<SegmentData> {
  const { SEGMENT_SPACE_ID = "", SEGMENT_PROFILE_KEY = "", SEGMENT_TRAIT_CHECK = "" } = process.env;

  if (!SEGMENT_SPACE_ID || !SEGMENT_PROFILE_KEY || !SEGMENT_TRAIT_CHECK || !email) {
    return { foundInSegment: false };
  }

  try {
    const traits = await fetchSegmentTraits(email, SEGMENT_TRAIT_CHECK);
    if (traits) {
      return {
        foundInSegment: true,
        [SEGMENT_TRAIT_CHECK]: traits[SEGMENT_TRAIT_CHECK],
      };
    }
  } catch (e: any) {
    console.error("Error fetching Segment traits:", e?.status ?? e?.message ?? "unknown error");
  }

  return { foundInSegment: false };
}
