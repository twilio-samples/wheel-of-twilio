export const enum Stages {
  NEW_USER = 1,
  VERIFYING = 2,
  VERIFIED_USER = 3,
  COUNTRY_SELECTED = 4,
  WINNER_UNCLAIMED = 5,
  WINNER_CLAIMED = 6,
  RAFFLE_WINNER = 7,
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
