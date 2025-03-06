import { expect, test, describe, vi } from "vitest";
import { generateResponse, getCountry } from "@/app/api/incoming/helper";
import { Stages } from "@/app/types";

const firstWedge = (process.env.NEXT_PUBLIC_WEDGES || "").split(",")[0];

describe("Lead collection disabled", async () => {
  describe("For known user, get country", async () => {
    test("German phone number returns correct country/language", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "false");
      const country = await getCountry("+4915112341234");
      expect(country?.name).toBe("Germany");
      expect(country?.languages[0]).toBe("de");
    });

    test("British phone number returns UK/English", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "false");
      const country = await getCountry("+441312345678");
      expect(country?.name).toBe("United Kingdom");
      expect(country?.languages[0]).toBe("en");
    });

    test("Unknown phone number returns undefined", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "false");
      const country = await getCountry("+1234567");
      expect(country).toBeUndefined();
    });

    test("US phone number returns US/English", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "false");
      const country = await getCountry("+12127363100");
      expect(country?.name).toBe("United States");
      expect(country?.languages[0]).toBe("en");
    });
  });

  describe("For unknown user, generate welcome message", async () => {
    test("Test responses with invalid country code", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "false");
      await expect(
        (async () => {
          // @ts-ignore just for this test
          await generateResponse(undefined, undefined, {
            senderName: "test-better",
            senderID: "unknown",
            hashedSender: "test-better",
            messageContent: "Hello, I'm a new user",
            attendeesMap: {
              // @ts-ignore
              syncMapItems: {
                create: async (data: any) => {
                  return data;
                },
              },
            },
          });
        })(),
      ).rejects.toThrowError(/Invalid country/);
    });

    test("Test English response from generateResponse", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "false");
      // @ts-ignore just for this test
      const newUserWelcome = await generateResponse(undefined, undefined, {
        messageContent: "Hello, I'm a new user",
        senderID: "+4477002341234",
        recipient: "+4915156785678",
        attendeesMap: {
          // @ts-ignore
          syncMapItems: {
            create: async (data: any) => {
              return data;
            },
          },
        },
      });
      expect(newUserWelcome).toContain(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Welcome to the game`,
      );
      expect(newUserWelcome).toContain(`</Message></Response>`);
    });
  });

  describe("For unnamed user, generate response", async () => {
    test("Prompt NEW_USER for name", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "false");
      const currentUser = {
        name: "test-better",
        sender: "+11231232468",
        recipient: "+4915156785678",
        bet: "test-better",
        stage: Stages.NEW_USER,
      };

      // @ts-ignore just for this test
      const newUserWelcome = await generateResponse(currentUser, undefined, {
        messageContent: "Hello, I'm a new user",
        betsDoc: {
          data: {
            bets: [],
            temporaryBlock: false,
            closed: false,
          },
        },
        // @ts-ignore
        attendeesMap: {
          syncMapItems: () => {
            return {
              update: async (data: any) => {
                return data;
              },
            };
          },
        },
      });
      expect(newUserWelcome).toContain(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Thank you.`,
      );
    });
  });

  describe("For known user, generate response", async () => {
    test("Catch invalid email for German user at stage NAME_CONFIRMED", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "false");
      const currentUser = {
        name: "test-better",
        sender: "+11231232468",
        recipient: "+4915156785678",
        bet: "test-better",
        stage: Stages.NAME_CONFIRMED,
      };

      // @ts-ignore just for this test
      const newUserWelcome = await generateResponse(currentUser, undefined, {
        messageContent: "Hello, I'm a new user",
        // @ts-ignore
        attendeesMap: {},
      });
      expect(newUserWelcome).toContain(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, this is not a valid email address`,
      );
      expect(newUserWelcome).toContain(`</Message></Response>`);
    });

    test("Catch invalid email for English user at stage NAME_CONFIRMED", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "false");
      const currentUser = {
        name: "test-better",
        sender: "+115112341234",
        recipient: "+4915156785678",
        bet: "test-better",
        stage: Stages.NAME_CONFIRMED,
      };

      // @ts-ignore just for this test
      const response = await generateResponse(currentUser, undefined, {
        messageContent: "Hello, I'm a new user",
        // @ts-ignore
        attendeesMap: {},
      });
      expect(response).toContain(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, this is not a valid email address`,
      );
      expect(response).toContain(`</Message></Response>`);
    });
  });

  describe("For unverified user, generate response", async () => {
    test("Check for right message when the no code is sent", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "false");
      const currentUser = {
        name: "test-better",
        sender: "+11231232468",
        bet: "test-better",
        stage: Stages.VERIFYING,
      };

      // @ts-ignore just for this test
      const response = await generateResponse(currentUser, undefined, {
        messageContent: "Hello, I'm a new user",
        // @ts-ignore
        attendeesMap: {},
        // @ts-ignore
        betsDoc: {
          data: {
            bets: [],
            temporaryBlock: true,
            closed: false,
          },
        },
      });
      expect(response).toContain(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, the verification code is incorrect. Please try again or enter a new email address.`,
      );
      expect(response).toContain(`</Message></Response>`);
    });

    test("Check for right message when a valid code is sent", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "false");
      const currentUser = {
        name: "test-better",
        sender: "+4915112341234",
        bet: "test-better",
        stage: Stages.VERIFYING,
      };

      const response = await generateResponse(
        // @ts-ignore just for this test
        currentUser,
        {
          messages: {
            // @ts-ignore just for this test
            create: (c) => {
              expect(c.contentSid).toContain("HX");
            },
          },
          verify: {
            v2: {
              // @ts-ignore just for this test
              services: () => {
                return {
                  verificationChecks: {
                    create: async () => {
                      return { status: "approved" };
                    },
                  },
                };
              },
            },
          },
        },
        {
          messageContent: "My code is 123456",
          // @ts-ignore
          attendeesMap: {
            syncMapItems: () => {
              return {
                update: async (data: any) => {
                  return data;
                },
              };
            },
          },
          // @ts-ignore
          betsDoc: {
            data: {
              bets: {},
              temporaryBlock: true,
              closed: false,
            },
          },
        },
      );
      expect(response).toBe(
        `<?xml version="1.0" encoding="UTF-8"?><Response/>`,
      );
    });

    test("Check for right message when an invalid code is sent", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "false");
      const currentUser = {
        name: "test-better",
        sender: "+4915112341234",
        bet: "test-better",
        stage: Stages.VERIFYING,
      };

      const response = await generateResponse(
        // @ts-ignore just for this test
        currentUser,
        {
          messages: {
            // @ts-ignore just for this test
            create: (c) => {
              expect(c.contentSid).toContain("HX");
            },
          },
          verify: {
            v2: {
              // @ts-ignore just for this test
              services: () => {
                return {
                  verificationChecks: {
                    create: async () => {
                      return { status: "denied" };
                    },
                  },
                };
              },
            },
          },
        },
        {
          messageContent: "My code is 123456",
          // @ts-ignore
          attendeesMap: {
            syncMapItems: () => {
              return {
                update: async (data: any) => {
                  return data;
                },
              };
            },
          },
          // @ts-ignore
          betsDoc: {
            data: {
              bets: {},
              temporaryBlock: true,
              closed: false,
            },
          },
        },
      );
      expect(response).toBe(
        `<?xml version="1.0" encoding="UTF-8"?><Response/>`,
      );
    });
  });

  describe("For verified users with selected country, generate response", async () => {
    test("Check for right message when bets are blocked", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "false");
      const currentUser = {
        name: "test-better",
        sender: "+115112341234",
        recipient: "+4915156785678",
        bet: "test-better",
        stage: Stages.VERIFIED_USER,
      };

      // @ts-ignore just for this test
      const response = await generateResponse(currentUser, undefined, {
        messageContent: "Hello, I'm a new user",
        // @ts-ignore
        attendeesMap: {},
        // @ts-ignore
        betsDoc: {
          data: {
            bets: {},
            temporaryBlock: true,
            closed: false,
          },
        },
      });
      expect(response).toContain(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>The wheel is already spinning. We cannot accept your bet anymore.`,
      );
      expect(response).toContain(`</Message></Response>`);
    });

    test("Check for right message when a valid bet is placed", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "false");
      const currentUser = {
        name: "test-better",
        sender: "+115112341234",
        recipient: "+4915156785678",
        bet: "test-better",
        stage: Stages.VERIFIED_USER,
      };

      // @ts-ignore just for this test
      const response = await generateResponse(currentUser, undefined, {
        messageContent: `Hello, I'd like to bet on ${firstWedge}`,
        // @ts-ignore
        attendeesMap: {
          syncMapItems: () => {
            return {
              update: async (data: any) => {
                return data;
              },
            };
          },
        },
        // @ts-ignore
        betsDoc: {
          data: {
            bets: [],
            temporaryBlock: false,
            closed: false,
          },
          update: async (data: any) => {
            return data;
          },
        },
      });
      expect(response).toContain(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Thank you.`,
      );
      expect(response).toContain(`</Message></Response>`);
    });

    test("Check for right message when an invalid bet is placed", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "false");
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "false");
      const currentUser = {
        name: "test-better",
        sender: "+115112341234",
        recipient: "+4915156785678",
        bet: "test-better",
        stage: Stages.VERIFIED_USER,
      };

      const response = await generateResponse(
        // @ts-ignore just for this test
        currentUser,
        {
          messages: {
            // @ts-ignore just for this test
            create: (c) => {
              expect(c.contentSid).toContain("HX");
            },
          },
        },
        {
          messageContent: "No bet found here",
          // @ts-ignore
          attendeesMap: {},
          // @ts-ignore
          betsDoc: {
            data: {
              bets: {},
              temporaryBlock: false,
              closed: false,
            },
            update: async (data: any) => {
              return data;
            },
          },
        },
      );
      expect(response).toEqual(
        `<?xml version="1.0" encoding="UTF-8"?><Response/>`,
      );
    });
  });

  describe("For winner user, generate response", async () => {
    test("Check for right message when the stage is WINNER_UNCLAIMED and offered small prizes", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "false");
      vi.stubEnv("OFFERED_PRIZES", "small");

      const currentUser = {
        name: "test-better",
        sender: "+115112341234",
        recipient: "+4915156785678",
        bet: "test-better",
        stage: Stages.WINNER_UNCLAIMED,
      };

      // @ts-ignore just for this test
      const response = await generateResponse(
        // @ts-ignore just for this test
        currentUser,
        {
          messages: {
            // @ts-ignore just for this test
            create: (c) => {
              expect(c.body).toContain(
                "Congrats, you already won. Stop by the Twilio booth to claim your prize!",
              );
            },
          },
        },
        {
          messageContent: "Hello, I'm a new user",
          // @ts-ignore
          attendeesMap: {},
          // @ts-ignore
          betsDoc: {
            data: {
              bets: {},
              temporaryBlock: true,
              closed: false,
            },
          },
        },
      );
      expect(response).toContain(
        `<?xml version="1.0" encoding="UTF-8"?><Response/>`,
      );
    });

    test("Check for right message when the stage is WINNER_UNCLAIMED and offered both prizes", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "false");
      vi.stubEnv("OFFERED_PRIZES", "both");

      const currentUser = {
        name: "test-better",
        sender: "+115112341234",
        recipient: "+4915156785678",
        bet: "test-better",
        stage: Stages.WINNER_UNCLAIMED,
      };

      // @ts-ignore just for this test
      const response = await generateResponse(
        // @ts-ignore just for this test
        currentUser,
        {
          messages: {
            // @ts-ignore just for this test
            create: (c) => {
              expect(c.body).toContain(
                "Congrats, you already won. Stop by the Twilio booth to claim your prize!",
              );
            },
          },
        },
        {
          messageContent: "Hello, I'm a new user",
          // @ts-ignore
          attendeesMap: {},
          // @ts-ignore
          betsDoc: {
            data: {
              bets: {},
              temporaryBlock: true,
              closed: false,
            },
          },
        },
      );
      expect(response).toContain(
        `<?xml version="1.0" encoding="UTF-8"?><Response/>`,
      );
    });

    test("Check for right message when the stage is WINNER_UNCLAIMED and offered big prizes", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "false");
      vi.stubEnv("OFFERED_PRIZES", "big");

      const currentUser = {
        name: "test-better",
        sender: "+115112341234",
        recipient: "+4915156785678",
        bet: "test-better",
        stage: Stages.WINNER_UNCLAIMED,
      };

      // @ts-ignore just for this test
      const response = await generateResponse(
        // @ts-ignore just for this test
        currentUser,
        {
          messages: {
            // @ts-ignore just for this test
            create: (c) => {
              expect(c.body).toContain(
                "Congrats, you already guessed the right field in a previous round.",
              );
            },
          },
        },
        {
          messageContent: "Hello, I'm a new user",
          // @ts-ignore
          attendeesMap: {},
          // @ts-ignore
          betsDoc: {
            data: {
              bets: {},
              temporaryBlock: true,
              closed: false,
            },
          },
        },
      );
      expect(response).toContain(
        `<?xml version="1.0" encoding="UTF-8"?><Response/>`,
      );
    });

    test("Check for right message when the stage is WINNER_CLAIMED", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "false");
      const currentUser = {
        name: "test-better",
        sender: "+115112341234",
        recipient: "+4915156785678",
        bet: "test-better",
        stage: Stages.WINNER_CLAIMED,
      };

      // @ts-ignore just for this test
      const response = await generateResponse(
        // @ts-ignore just for this test
        currentUser,
        {
          messages: {
            // @ts-ignore just for this test
            create: (c) => {
              expect(c.body).toContain(
                "Enjoy your prize. Feel free to visit the Twilio booth",
              );
            },
          },
        },
        {
          messageContent: "Hello, I'm a new user",
          // @ts-ignore
          attendeesMap: {},
          // @ts-ignore
          betsDoc: {
            data: {
              bets: {},
              temporaryBlock: false,
              closed: false,
            },
          },
        },
      );
      expect(response).toContain(
        `<?xml version="1.0" encoding="UTF-8"?><Response/>`,
      );
    });
  });

  describe("Check if max bets are handled correctly", async () => {
    test("Check for right message when the max bets are reached", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "false");
      vi.stubEnv("MAX_BETS", "2");
      const currentUser = {
        name: "test-better",
        sender: "+115112341234",
        recipient: "+4915156785678",
        bet: "test-better",
        submittedBets: 3,
        stage: Stages.VERIFIED_USER,
      };

      // @ts-ignore just for this test
      const response = await generateResponse(
        // @ts-ignore just for this test
        currentUser,
        {
          messages: {
            // @ts-ignore just for this test
            create: (c) => {
              debugger;
              expect(c.body).toContain("");
            },
          },
        },
        {
          messageContent: `Hello, I'd like to bet on ${firstWedge}`,
          // @ts-ignore
          attendeesMap: {},
          // @ts-ignore
          betsDoc: {
            data: {
              bets: [],
              temporaryBlock: false,
              closed: false,
            },
          },
        },
      );
      expect(response).toContain(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, you have already placed the maximum number of bets.</Message>',
      );
    });

    test("Check for right message when the max bets are not reached", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "false");
      vi.stubEnv("MAX_BETS", "20");
      const currentUser = {
        name: "test-better",
        sender: "+115112341234",
        recipient: "+4915156785678",
        bet: "test-better",
        submittedBets: 2,
        stage: Stages.VERIFIED_USER,
      };

      // @ts-ignore just for this test
      const response = await generateResponse(
        // @ts-ignore just for this test
        currentUser,
        {
          messages: {
            // @ts-ignore just for this test
            create: (c) => {
              expect(c.body).toContain(
                "You have successfully placed your bet. Good luck!",
              );
            },
          },
        },
        {
          messageContent: `Hello, I'd like to bet on ${firstWedge}`,
          // @ts-ignore
          attendeesMap: {},
          // @ts-ignore
          betsDoc: {
            data: {
              bets: [],
              temporaryBlock: false,
              closed: false,
            },
          },
        },
      );
      expect(response).toContain(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, you have already placed the maximum number of bets.</Message>',
      );
    });

    test("Check for right message when there are no max bets", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "false");
      vi.stubEnv("MAX_BETS", "0");
      const currentUser = {
        name: "test-better",
        sender: "+115112341234",
        recipient: "+4915156785678",
        bet: "test-better",
        submittedBets: 2,
        stage: Stages.VERIFIED_USER,
      };

      // @ts-ignore just for this test
      const response = await generateResponse(
        // @ts-ignore just for this test
        currentUser,
        {
          messages: {
            // @ts-ignore just for this test
            create: (c) => {
              expect(c.body).toContain(
                "You have successfully placed your bet. Good luck!",
              );
            },
          },
        },
        {
          messageContent: `Hello, I'd like to bet on ${firstWedge}`,
          // @ts-ignore
          attendeesMap: {},
          // @ts-ignore
          betsDoc: {
            data: {
              bets: [],
              temporaryBlock: false,
              closed: false,
            },
          },
        },
      );
      expect(response).toContain(
        '<?xml version="1.0" encoding="UTF-8"?><Response>',
      );
    });
  });

  test("Check for right message when the stage is unknown", async () => {
    vi.stubEnv("DISABLE_LEAD_COLLECTION", "false");
    const currentUser = {
      name: "test-better",
      sender: "+4915112341234",
      recipient: "+4915156785678",
      bet: "test-better",
      stage: "UNKNOWN",
    };

    const response = await generateResponse(
      // @ts-ignore just for this test
      currentUser,
      {
        messages: {
          // @ts-ignore just for this test
          create: (c) => {
            expect(c.body).toContain(
              "Sorry, an error occurred. Please try again later.",
            );
          },
        },
      },
      {
        messageContent: "Hello, I'm a new user",
        // @ts-ignore
        attendeesMap: {},
        // @ts-ignore
        betsDoc: {
          data: {
            bets: {},
            temporaryBlock: false,
            closed: false,
          },
        },
      },
    );
    expect(response).toContain(
      `<?xml version="1.0" encoding="UTF-8"?><Response`,
    );
  });
});

describe("Lead collection enabled", async () => {
  describe("For unknown user, generate welcome message", async () => {
    test("Test responses with invalid country code", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "true");
      await expect(
        (async () => {
          // @ts-ignore just for this test
          await generateResponse(undefined, undefined, {
            senderName: "test-better",
            senderID: "unknown",
            hashedSender: "test-better",
            messageContent: "Hello, I'm a new user",
            attendeesMap: {
              // @ts-ignore
              syncMapItems: {
                create: async (data: any) => {
                  return data;
                },
              },
            },
          });
        })(),
      ).rejects.toThrowError(/Invalid country/);
    });

    test("Test English response from generateResponse", async () => {
      // @ts-ignore just for this test
      const newUserWelcome = await generateResponse(
        undefined,
        {
          messages: {
            // @ts-ignore just for this test
            create: (c) => {
              expect(c.contentSid).toContain("HX");
            },
          },
        },
        {
          messageContent: "Hello, I'm a new user",
          senderID: "+4477002341234",
          recipient: "+4915156785678",
          attendeesMap: {
            // @ts-ignore
            syncMapItems: {
              create: async (data: any) => {
                return data;
              },
            },
          },
        },
      );
      expect(newUserWelcome).toContain(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Welcome to the game`,
      );
      expect(newUserWelcome).toContain(`</Message></Response>`);
    });
  });

  describe("For unnamed user, generate response", async () => {
    test("Prompt NEW_USER for name", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "true");
      const currentUser = {
        name: "test-better",
        sender: "+11231232468",
        recipient: "+4915156785678",
        submittedBets: 1,
        bet: "test-better",
        stage: Stages.NEW_USER,
      };

      // @ts-ignore just for this test
      const newUserWelcome = await generateResponse(
        currentUser,
        {
          messages: {
            // @ts-ignore just for this test
            create: (c) => {
              expect(c.contentSid).toContain("HX");
            },
          },
        },
        {
          messageContent: "Hello, I'm a new user",
          betsDoc: {
            data: {
              bets: [],
              temporaryBlock: false,
              closed: false,
            },
          },
          // @ts-ignore
          attendeesMap: {
            syncMapItems: () => {
              return {
                update: async (data: any) => {
                  return data;
                },
              };
            },
          },
        },
      );
      expect(newUserWelcome).toContain(
        `<?xml version="1.0" encoding="UTF-8"?><Response/>`,
      );
    });
  });

  describe("For unverified user, generate response", async () => {
    test("Check for right message when the no code is sent", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "true");
      const currentUser = {
        name: "test-better",
        sender: "+11231232468",
        bet: "test-better",
        stage: Stages.VERIFYING,
      };

      // @ts-ignore just for this test
      const response = await generateResponse(currentUser, undefined, {
        messageContent: "Hello, I'm a new user",
        // @ts-ignore
        attendeesMap: {},
        // @ts-ignore
        betsDoc: {
          data: {
            bets: [],
            temporaryBlock: true,
            closed: false,
          },
        },
      });
      expect(response).toContain(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>The wheel is already spinning. We cannot accept your bet anymore.`,
      );
    });
  });

  describe("For verified users with selected country, generate response", async () => {
    test("Check for right message when bets are blocked", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "true");
      const currentUser = {
        name: "test-better",
        sender: "+115112341234",
        recipient: "+4915156785678",
        bet: "test-better",
        stage: Stages.VERIFIED_USER,
      };

      // @ts-ignore just for this test
      const response = await generateResponse(currentUser, undefined, {
        messageContent: "Hello, I'm a new user",
        // @ts-ignore
        attendeesMap: {},
        // @ts-ignore
        betsDoc: {
          data: {
            bets: {},
            temporaryBlock: true,
            closed: false,
          },
        },
      });
      expect(response).toContain(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>The wheel is already spinning. We cannot accept your bet anymore.`,
      );
      expect(response).toContain(`</Message></Response>`);
    });

    test("Check for right message when a valid bet is placed", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "true");
      const currentUser = {
        name: "test-better",
        sender: "+115112341234",
        recipient: "+4915156785678",
        bet: "test-better",
        stage: Stages.VERIFIED_USER,
      };

      // @ts-ignore just for this test
      const response = await generateResponse(currentUser, undefined, {
        messageContent: `Hello, I'd like to bet on ${firstWedge}`,
        // @ts-ignore
        attendeesMap: {
          syncMapItems: () => {
            return {
              update: async (data: any) => {
                return data;
              },
            };
          },
        },
        // @ts-ignore
        betsDoc: {
          data: {
            bets: [],
            temporaryBlock: false,
            closed: false,
          },
          update: async (data: any) => {
            return data;
          },
        },
      });
      expect(response).toContain(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Thank you.`,
      );
      expect(response).toContain(`</Message></Response>`);
    });

    test("Check for right message when an invalid bet is placed", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "true");
      const currentUser = {
        name: "test-better",
        sender: "+115112341234",
        recipient: "+4915156785678",
        bet: "test-better",
        stage: Stages.VERIFIED_USER,
      };

      const response = await generateResponse(
        // @ts-ignore just for this test
        currentUser,
        {
          messages: {
            // @ts-ignore just for this test
            create: (c) => {
              expect(c.contentSid).toContain("HX");
            },
          },
        },
        {
          messageContent: "No bet found here",
          // @ts-ignore
          attendeesMap: {},
          // @ts-ignore
          betsDoc: {
            data: {
              bets: {},
              temporaryBlock: false,
              closed: false,
            },
            update: async (data: any) => {
              return data;
            },
          },
        },
      );
      expect(response).toEqual(
        `<?xml version="1.0" encoding="UTF-8"?><Response/>`,
      );
    });
  });

  describe("For winner user, generate response", async () => {
    test("Check for right message when the stage is WINNER_UNCLAIMED and offered small prizes", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "true");
      vi.stubEnv("OFFERED_PRIZES", "small");

      const currentUser = {
        name: "test-better",
        sender: "+115112341234",
        recipient: "+4915156785678",
        bet: "test-better",
        stage: Stages.WINNER_UNCLAIMED,
      };

      // @ts-ignore just for this test
      const response = await generateResponse(
        // @ts-ignore just for this test
        currentUser,
        {
          messages: {
            // @ts-ignore just for this test
            create: (c) => {
              expect(c.body).toContain(
                "Congrats, you already won. Stop by the Twilio booth to claim your prize!",
              );
            },
          },
        },
        {
          messageContent: "Hello, I'm a new user",
          // @ts-ignore
          attendeesMap: {},
          // @ts-ignore
          betsDoc: {
            data: {
              bets: {},
              temporaryBlock: true,
              closed: false,
            },
          },
        },
      );
      expect(response).toContain(
        `<?xml version="1.0" encoding="UTF-8"?><Response/>`,
      );
    });

    test("Check for right message when the stage is WINNER_UNCLAIMED and offered both prizes", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "true");
      vi.stubEnv("OFFERED_PRIZES", "both");

      const currentUser = {
        name: "test-better",
        sender: "+115112341234",
        recipient: "+4915156785678",
        bet: "test-better",
        stage: Stages.WINNER_UNCLAIMED,
      };

      // @ts-ignore just for this test
      const response = await generateResponse(
        // @ts-ignore just for this test
        currentUser,
        {
          messages: {
            // @ts-ignore just for this test
            create: (c) => {
              expect(c.body).toContain(
                "Congrats, you already won. Stop by the Twilio booth to claim your prize!",
              );
            },
          },
        },
        {
          messageContent: "Hello, I'm a new user",
          // @ts-ignore
          attendeesMap: {},
          // @ts-ignore
          betsDoc: {
            data: {
              bets: {},
              temporaryBlock: true,
              closed: false,
            },
          },
        },
      );
      expect(response).toContain(
        `<?xml version="1.0" encoding="UTF-8"?><Response/>`,
      );
    });

    test("Check for right message when the stage is WINNER_UNCLAIMED and offered big prizes", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "true");
      vi.stubEnv("OFFERED_PRIZES", "big");

      const currentUser = {
        name: "test-better",
        sender: "+115112341234",
        recipient: "+4915156785678",
        bet: "test-better",
        stage: Stages.WINNER_UNCLAIMED,
      };

      // @ts-ignore just for this test
      const response = await generateResponse(
        // @ts-ignore just for this test
        currentUser,
        {
          messages: {
            // @ts-ignore just for this test
            create: (c) => {
              expect(c.body).toContain(
                "Congrats, you already guessed the right field in a previous round.",
              );
            },
          },
        },
        {
          messageContent: "Hello, I'm a new user",
          // @ts-ignore
          attendeesMap: {},
          // @ts-ignore
          betsDoc: {
            data: {
              bets: {},
              temporaryBlock: true,
              closed: false,
            },
          },
        },
      );
      expect(response).toContain(
        `<?xml version="1.0" encoding="UTF-8"?><Response/>`,
      );
    });

    test("Check for right message when the stage is WINNER_CLAIMED", async () => {
      vi.stubEnv("DISABLE_LEAD_COLLECTION", "true");
      const currentUser = {
        name: "test-better",
        sender: "+115112341234",
        recipient: "+4915156785678",
        bet: "test-better",
        stage: Stages.WINNER_CLAIMED,
      };

      // @ts-ignore just for this test
      const response = await generateResponse(
        // @ts-ignore just for this test
        currentUser,
        {
          messages: {
            // @ts-ignore just for this test
            create: (c) => {
              expect(c.body).toContain(
                "Enjoy your prize. Feel free to visit the Twilio booth",
              );
            },
          },
        },
        {
          messageContent: "Hello, I'm a new user",
          // @ts-ignore
          attendeesMap: {},
          // @ts-ignore
          betsDoc: {
            data: {
              bets: {},
              temporaryBlock: false,
              closed: false,
            },
          },
        },
      );
      expect(response).toContain(
        `<?xml version="1.0" encoding="UTF-8"?><Response/>`,
      );
    });
  });

  // describe("Check if max bets are handled correctly", async () => {
  //   test("Check for right message when the max bets are reached", async () => {
  //     vi.stubEnv("MAX_BETS", "2");
  //     const currentUser = {
  //       name: "test-better",
  //       sender: "+115112341234",
  //       recipient: "+4915156785678",
  //       bet: "test-better",
  //       submittedBets: 3,
  //       stage: Stages.VERIFIED_USER,
  //     };

  //     // @ts-ignore just for this test
  //     const response = await generateResponse(
  //       // @ts-ignore just for this test
  //       currentUser,
  //       {
  //         messages: {
  //           // @ts-ignore just for this test
  //           create: (c) => {
  //             debugger;
  //             expect(c.body).toContain("");
  //           },
  //         },
  //       },
  //       {
  //         messageContent: `Hello, I'd like to bet on ${firstWedge}`,
  //         // @ts-ignore
  //         attendeesMap: {},
  //         // @ts-ignore
  //         betsDoc: {
  //           data: {
  //             bets: [],
  //             temporaryBlock: false,
  //             closed: false,
  //           },
  //         },
  //       }
  //     );
  //     expect(response).toContain(
  //       '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, you have already placed the maximum number of bets.</Message>'
  //     );
  //   });

  //   test("Check for right message when the max bets are not reached", async () => {
  //     vi.stubEnv("MAX_BETS", "20");
  //     const currentUser = {
  //       name: "test-better",
  //       sender: "+115112341234",
  //       recipient: "+4915156785678",
  //       bet: "test-better",
  //       submittedBets: 2,
  //       stage: Stages.VERIFIED_USER,
  //     };

  //     // @ts-ignore just for this test
  //     const response = await generateResponse(
  //       // @ts-ignore just for this test
  //       currentUser,
  //       {
  //         messages: {
  //           // @ts-ignore just for this test
  //           create: (c) => {
  //             expect(c.body).toContain(
  //               "You have successfully placed your bet. Good luck!"
  //             );
  //           },
  //         },
  //       },
  //       {
  //         messageContent: `Hello, I'd like to bet on ${firstWedge}`,
  //         // @ts-ignore
  //         attendeesMap: {},
  //         // @ts-ignore
  //         betsDoc: {
  //           data: {
  //             bets: [],
  //             temporaryBlock: false,
  //             closed: false,
  //           },
  //         },
  //       }
  //     );
  //     expect(response).toContain(
  //       '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, you have already placed the maximum number of bets.</Message>'
  //     );
  //   });

  //   test("Check for right message when there are no max bets", async () => {
  //     vi.stubEnv("MAX_BETS", "0");
  //     const currentUser = {
  //       name: "test-better",
  //       sender: "+115112341234",
  //       recipient: "+4915156785678",
  //       bet: "test-better",
  //       submittedBets: 2,
  //       stage: Stages.VERIFIED_USER,
  //     };

  //     // @ts-ignore just for this test
  //     const response = await generateResponse(
  //       // @ts-ignore just for this test
  //       currentUser,
  //       {
  //         messages: {
  //           // @ts-ignore just for this test
  //           create: (c) => {
  //             expect(c.body).toContain(
  //               "You have successfully placed your bet. Good luck!"
  //             );
  //           },
  //         },
  //       },
  //       {
  //         messageContent: `Hello, I'd like to bet on ${firstWedge}`,
  //         // @ts-ignore
  //         attendeesMap: {},
  //         // @ts-ignore
  //         betsDoc: {
  //           data: {
  //             bets: [],
  //             temporaryBlock: false,
  //             closed: false,
  //           },
  //         },
  //       }
  //     );
  //     expect(response).toContain(
  //       '<?xml version="1.0" encoding="UTF-8"?><Response>'
  //     );
  //   });
  // });

  // test("Check for right message when the stage is unknown", async () => {
  //   const currentUser = {
  //     name: "test-better",
  //     sender: "+4915112341234",
  //     recipient: "+4915156785678",
  //     bet: "test-better",
  //     stage: "UNKNOWN",
  //   };

  //   const response = await generateResponse(
  //     // @ts-ignore just for this test
  //     currentUser,
  //     {
  //       messages: {
  //         // @ts-ignore just for this test
  //         create: (c) => {
  //           expect(c.body).toContain(
  //             "Sorry, an error occurred. Please try again later."
  //           );
  //         },
  //       },
  //     },
  //     {
  //       messageContent: "Hello, I'm a new user",
  //       // @ts-ignore
  //       attendeesMap: {},
  //       // @ts-ignore
  //       betsDoc: {
  //         data: {
  //           bets: {},
  //           temporaryBlock: false,
  //           closed: false,
  //         },
  //       },
  //     }
  //   );
  //   expect(response).toContain(
  //     `<?xml version="1.0" encoding="UTF-8"?><Response`
  //   );
  // });
});
