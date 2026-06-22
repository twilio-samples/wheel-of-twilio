import type { MemoryClient, TACConfig } from "twilio-agent-connect";

export interface BadgeData {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  country: string;
  jobTitle: string;
}

export async function lookupProfileByPhone(
  client: MemoryClient,
  phone: string,
): Promise<string | null> {
  try {
    const result = await client.lookupProfile("phone", phone);
    return result.profiles.length > 0 ? result.profiles[0] : null;
  } catch {
    return null;
  }
}

export async function getProfileTraits(
  client: MemoryClient,
  profileId: string,
): Promise<Record<string, unknown> | null> {
  try {
    const profile = await client.getProfile(profileId);
    if (!profile.traits || Object.keys(profile.traits).length === 0) return null;
    return profile.traits;
  } catch {
    return null;
  }
}

export async function createBadgeProfile(
  client: MemoryClient,
  phone: string,
  badge: BadgeData,
): Promise<string> {
  return client.createProfile({
    Contact: {
      phone,
      firstName: badge.firstName,
      lastName: badge.lastName,
      email: badge.email,
      country: badge.country,
    },
  });
}

export async function deleteMemoryProfile(
  config: TACConfig,
  memoryStoreId: string,
  profileId: string,
): Promise<void> {
  const credentials = Buffer.from(
    `${config.accountSid}:${config.authToken}`,
  ).toString("base64");
  const url = `https://memory.twilio.com/v1/Stores/${memoryStoreId}/Profiles/${profileId}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(
      `Failed to delete profile: ${res.status} ${res.statusText}`,
    );
  }
}
