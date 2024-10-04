import { ICountry, countries } from "countries-list";
import { PhoneNumberUtil } from "google-libphonenumber";

const phoneUtil = PhoneNumberUtil.getInstance();

import twilio, { twiml } from "twilio";
import i18next from "i18next";
import { createHash } from "crypto";
import { Player, Stages } from "../../types";
import { SyncMapContext } from "twilio/lib/rest/sync/v1/service/syncMap";
import { DocumentInstance } from "twilio/lib/rest/sync/v1/service/document";
import { maskNumber } from "@/app/util";
import { handleSegmentProfilesAPI } from "@/app/twilio";

const en = require("../../../locale/en.json");
const de = require("../../../locale/de.json");
const fr = require("../../../locale/fr.json");
const es = require("../../../locale/es.json");

const ONE_WEEK = 60 * 60 * 24 * 7;
const {
  VERIFY_SERVICE_SID = "",
  EVENT_NAME = "",
  MESSAGING_SERVICE_SID = "",
  NEXT_PUBLIC_WEDGES = "",
  OFFER_SMALL_PRIZES = "false",
  MAX_BETS_PER_USER = "0",
  DISABLE_LEAD_COLLECTION = "false",
  SEGMENT_SPACE_ID = "",
  SEGMENT_PROFILE_KEY = "",
  SEGMENT_TRAIT_CHECK = "",
} = process.env;

const wedges = NEXT_PUBLIC_WEDGES.split(",");

const regexForEmail = /[^@ \t\r\n]+@[^@ \t\r\n]+\.[^@ \t\r\n]+/;
const regexFor6ConsecutiveDigits = /\d{6}/;

async function initI18n(senderID: string) {
  let lng;
  if (senderID) {
    lng = getCountry(senderID)?.languages[0];
  }

  await i18next.init({
    lng,
    fallbackLng: "en",
    resources: {
      en,
      de,
      fr,
      es,
    },
  });
  return getCountry(senderID)?.name;
}

async function fetchSegmentTraits(email: string) {
  const response = await fetch(
    `https://profiles.segment.com/v1/spaces/${SEGMENT_SPACE_ID}/collections/users/profiles/email:${email}/traits`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(SEGMENT_PROFILE_KEY + ":").toString(
          "base64"
        )}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch Segment traits");
  }

  return response.json();
}

export async function generateResponse(
  currentUser: Player | undefined,
  client: twilio.Twilio,
  {
    senderName,
    senderID,
    recipient,
    messageContent,
    attendeesMap,
    betsDoc,
  }: {
    senderName?: string;
    senderID?: string;
    recipient: string;
    messageContent: string;
    attendeesMap: SyncMapContext;
    betsDoc: DocumentInstance;
  },
) {
  const twimlRes = new twiml.MessagingResponse();
  try {
    const matchedEmail = regexForEmail.exec(messageContent);
    const country = await initI18n(currentUser?.sender || senderID || "");
    const hashedSender = createHash("sha256")
      .update(currentUser?.sender || senderID || "")
      .digest("hex");

    if (DISABLE_LEAD_COLLECTION === "false") {
      if (!currentUser) {
        await attendeesMap.syncMapItems.create({
          ttl: ONE_WEEK,
          key: hashedSender,
          data: {
            name: senderName,
            country,
            recipient,
            sender: senderID,
            submittedBets: 0,
            stage: Stages.NEW_USER,
          },
        });

        twimlRes.message(
          i18next.t("welcome", {
            senderName: senderName ? `, ${senderName}` : "",
          }),
        );
      } else if (
        currentUser.stage === Stages.NEW_USER ||
        (currentUser.stage === Stages.VERIFYING && matchedEmail !== null)
      ) {
        if (matchedEmail === null) {
          twimlRes.message(i18next.t("invalidEmail"));
        } else {
          try {
            const verification = await client.verify.v2
              .services(VERIFY_SERVICE_SID)
              .verifications.create({
                to: matchedEmail[0],
                channel: "email",
                // locale: lng,
              });
            await attendeesMap.syncMapItems(hashedSender).update({
              data: {
                ...currentUser,
                email: matchedEmail[0],
                stage: Stages.VERIFYING,
                verificationSid: verification.sid,
              },
            });
            twimlRes.message(i18next.t("sentEmail"));
          } catch (e: any) {
            if (e?.message?.startsWith("Invalid parameter `To`:")) {
              twimlRes.message(i18next.t("invalidEmail"));
            } else {
              throw e;
            }
          }
        }
      } else if (currentUser.stage === Stages.VERIFYING) {
        try {
          const submittedCode = regexFor6ConsecutiveDigits.exec(messageContent);
          if (submittedCode === null) {
            throw new Error("Invalid code");
          }
          const verificationCheck = await client.verify.v2
            .services(VERIFY_SERVICE_SID)
            .verificationChecks.create({
              verificationSid: currentUser.verificationSid,
              code: submittedCode[0],
            });

          if (verificationCheck.status === "approved") {
            await Promise.all([
              attendeesMap.syncMapItems(hashedSender).update({
                data: {
                  ...currentUser,
                  stage: Stages.VERIFIED_USER,
                },
              }),
              client.messages.create({
                contentSid: i18next.t("betTemplateSID"),
                from: recipient,
                messagingServiceSid: MESSAGING_SERVICE_SID,
                to: currentUser.sender,
              }),
            ]);

            if (SEGMENT_SPACE_ID && SEGMENT_PROFILE_KEY) {
              const traits = await fetchSegmentTraits(currentUser.email);
              console.log("Segment Traits:", traits);
            }
          }
        } catch (e: any) {
          if (e.message !== "Invalid code") {
            throw e;
          }
          twimlRes.message(i18next.t("verificationFailed"));
        }
      } else if (currentUser.stage === Stages.VERIFIED_USER) {
        if (betsDoc.data.blocked) {
          twimlRes.message(i18next.t("betsClosed"));
          // check if one of the wedges is a substring of the capitalized messageContent
        } else if (
          wedges.some((wedge) =>
            capitalizeEachWord(messageContent).includes(
              capitalizeEachWord(wedge),
            ),
          )
        ) {
          const bets = betsDoc.data.bets ? [...betsDoc.data.bets] : [];
          //sort longest to shortest first
          const selectedBet = wedges
            .sort((a, b) => b.length - a.length)
            .find((wedge) =>
              capitalizeEachWord(messageContent).includes(
                capitalizeEachWord(wedge),
              ),
            );

          const existingBet = bets.find((bet: any) => bet[0] === hashedSender);

          const maxBetsReached =
            parseInt(MAX_BETS_PER_USER) > 0 &&
            currentUser.submittedBets >= parseInt(MAX_BETS_PER_USER);

          if (!existingBet && maxBetsReached) {
            twimlRes.message(i18next.t("maxBetsReached"));
            return twimlRes.toString();
          }

          if (existingBet) {
            existingBet[1] = selectedBet;
          } else {
            bets.push([
              hashedSender,
              selectedBet,
              senderName || maskNumber(senderID || ""),
            ]);
          }
          await betsDoc.update({
            data: {
              ...betsDoc.data,
              full: false,
              bets: [...bets],
            },
          });
          if (!existingBet) {
            // inc counter only if new bet and if it was successfully added
            await attendeesMap.syncMapItems(hashedSender).update({
              data: {
                ...currentUser,
                submittedBets: currentUser.submittedBets + 1,
                event: EVENT_NAME,
              },
            });
          }

          twimlRes.message(
            i18next.t("betPlaced", {
              messageContent: selectedBet,
            }),
          );
        } else {
          await client.messages.create({
            contentSid: i18next.t("invalidBetTemplateSID"),
            from: recipient,
            messagingServiceSid: MESSAGING_SERVICE_SID,
            to: currentUser.sender,
          });
        }
      } else if (currentUser.stage === Stages.WINNER_UNCLAIMED) {
        await client.messages.create({
          body:
            OFFER_SMALL_PRIZES === "true"
              ? i18next.t("alreadyPlayedNotClaimedSmallPrize")
              : i18next.t("alreadyPlayedNotClaimed"),
          from: recipient,
          messagingServiceSid: MESSAGING_SERVICE_SID,
          to: currentUser.sender,
        });
      } else if (
        currentUser.stage === Stages.WINNER_CLAIMED ||
        currentUser.stage === Stages.RAFFLE_WINNER
      ) {
        await client.messages.create({
          body: i18next.t("alreadyPlayedPrizeClaimed"),
          from: recipient,
          messagingServiceSid: MESSAGING_SERVICE_SID,
          to: currentUser.sender,
        });
      } else {
        await client.messages.create({
          body: i18next.t("catchAllError"),
          from: recipient,
          messagingServiceSid: MESSAGING_SERVICE_SID,
          to: currentUser.sender,
        });
        console.error("Unhandled stage", currentUser.stage, currentUser);
      }
    } else {
      if (!currentUser) {
        await attendeesMap.syncMapItems.create({
          ttl: ONE_WEEK,
          key: hashedSender,
          data: {
            name: senderName,
            sender: senderID,
            submittedBets: 0,
            stage: Stages.NEW_USER,
          },
        });

        twimlRes.message(
          i18next.t("welcomeNoLeadCollection", {
            senderName: senderName ? `, ${senderName}` : "",
          }),
        );

        setTimeout(async () => {
          await client.messages.create({
            contentSid: i18next.t("betTemplateSID"),
            from: recipient,
            messagingServiceSid: MESSAGING_SERVICE_SID,
            to: senderID || "",
          });
        }, 2000);
      } else if (betsDoc.data.blocked) {
        twimlRes.message(i18next.t("betsClosed"));
      } else if (
        wedges.some((wedge) =>
          capitalizeEachWord(messageContent).includes(
            capitalizeEachWord(wedge),
          ),
        )
      ) {
        const bets = betsDoc.data.bets ? [...betsDoc.data.bets] : [];
        const selectedBet = wedges
          .sort((a, b) => b.length - a.length)
          .find((wedge) =>
            capitalizeEachWord(messageContent).includes(
              capitalizeEachWord(wedge),
            ),
          );

        const existingBet = bets.find((bet: any) => bet[0] === hashedSender);

        const maxBetsReached =
          parseInt(MAX_BETS_PER_USER) > 0 &&
          currentUser?.submittedBets >= parseInt(MAX_BETS_PER_USER);

        if (!existingBet && maxBetsReached) {
          twimlRes.message(i18next.t("maxBetsReached"));
          return twimlRes.toString();
        }

        if (existingBet) {
          existingBet[1] = selectedBet;
        } else {
          bets.push([hashedSender, selectedBet, senderName]);
        }
        await betsDoc.update({
          data: {
            ...betsDoc.data,
            full: false,
            bets: [...bets],
          },
        });
        if (!existingBet && currentUser) {
          await attendeesMap.syncMapItems(hashedSender).update({
            data: {
              ...currentUser,
              submittedBets: currentUser.submittedBets + 1,
              event: EVENT_NAME,
            },
          });
        }

        twimlRes.message(
          i18next.t("betPlaced", {
            senderName,
            messageContent: selectedBet,
          }),
        );
      } else {
        await client.messages.create({
          contentSid: i18next.t("invalidBetTemplateSID"),
          from: recipient,
          messagingServiceSid: MESSAGING_SERVICE_SID,
          to: currentUser?.sender,
        });
      }
    }
  } catch (error: any) {
    if (error.code === 54006) {
      betsDoc.update({
        data: {
          ...betsDoc.data,
          full: true,
        },
      });
      twimlRes.message(i18next.t("roundFull"));
    } else {
      twimlRes.message(i18next.t("catchAllError"));
    }
    console.error(error.message);
    throw error;
  }

  return twimlRes.toString();
}

export function getCountry(phone: string): ICountry | undefined {
  const number = phoneUtil.parseAndKeepRawInput(phone.replace("whatsapp:", ""));
  return Object.values(countries).find((country) => {
    const countryCode = number.getCountryCode();
    if (countryCode) {
      return country.phone.includes(countryCode);
    }
  });
}

export function capitalizeEachWord(str: string) {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
