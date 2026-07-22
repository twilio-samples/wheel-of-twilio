export const enum GameState {
  RUNNING = "running",
  PAUSED = "paused",
  ENDED = "ended",
}

export const enum Stages {
  NEW_USER = "NEW_USER",
  NAME_CONFIRMED = "NAME_CONFIRMED",
  VERIFYING = "VERIFYING",
  VERIFIED_USER = "VERIFIED",
  WINNER_UNCLAIMED = "WINNER_UNCLAIMED",
  WINNER_CLAIMED = "WINNER_CLAIMED",
  RAFFLE_WINNER = "RAFFLE_WINNER",
}

export interface Player {
  name: string;
  sender: string;
  stage: Stages;
  submittedBets: number;
  country?: string;
  email?: string;
  verificationSid?: string;
  bet?: string;
  profileId?: string;
  foundInSegment?: boolean;
  [key: string]: unknown;
}
