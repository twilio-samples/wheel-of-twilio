export const enum Stages {
  NEW_USER = 1,
  VERIFYING = 2,
  VERIFIED_USER = 3,
  ASKING_FOR_COUNTRY = 4,
  WINNER_UNCLAIMED = 5,
  WINNER_CLAIMED = 6,
  RAFFLE_WINNER = 7,
}

export interface Player {
  name: string;
  sender: string;
  stage: Stages;
  country?: string;
  verificationSid?: string;
  bet?: string;
}
