export const enum Stages {
  NEW_USER = "NEW_USER",
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
  verificationSid?: string;
  bet?: string;
}
