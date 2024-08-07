export const enum Stages {
  NEW_USER = 1,
  VERIFYING = 2,
  VERIFIED_USER = 3,
  WINNER_UNCLAIMED = 4,
  WINNER_CLAIMED = 5,
  RAFFLE_WINNER = 6,
}

export interface Player {
  name: string;
  sender: string;
  stage: Stages;
  country?: string;
  verificationSid?: string;
  bet?: string;
}
