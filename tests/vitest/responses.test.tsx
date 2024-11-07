import { expect, test, describe } from "vitest";
import { generateResponse } from "@/app/api/incoming/helper";
import { Stages } from "@/app/types";

describe("For unknown user, generate welcome message", async () => {
  test("Test responses with invalid country code", async () => {
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
      })()
    ).rejects.toThrowError(/Invalid country/);
  });

  test("Test German response from generateResponse", async () => {
    // @ts-ignore just for this test
    const newUserWelcome = await generateResponse(undefined, undefined, {
      senderID: "+4915112341234",
      recipient: "+4915156785678",
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
    expect(newUserWelcome).toContain(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Willkommen im Spiel`
    );
    expect(newUserWelcome).toContain(`</Message></Response>`);
  });

  test("Test English response from generateResponse", async () => {
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
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Welcome to the game`
    );
    expect(newUserWelcome).toContain(`</Message></Response>`);
  });
});

describe("For unnamed user, generate response", async () => {
  test("Prompt NEW_USER for name", async () => {
    const currentUser = {
      name: "test-better",
      sender: "+4915112341234",
      recipient: "+4915156785678",
      bet: "test-better",
      stage: Stages.NEW_USER,
    };

    // @ts-ignore just for this test
    const newUserWelcome = await generateResponse(currentUser, undefined, {
      messageContent: "Hello, I'm a new user",
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
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Danke.`
    );
  });
});

describe("For known user, generate response", async () => {
  test("Catch invalid email for German user at stage NAME_CONFIRMED", async () => {
    const currentUser = {
      name: "test-better",
      sender: "+4915112341234",
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
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Leider ist dies keine gültige E-Mail-Adresse`
    );
    expect(newUserWelcome).toContain(`</Message></Response>`);
  });

  test("Catch invalid email for English user at stage NAME_CONFIRMED", async () => {
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
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, this is not a valid email address`
    );
    expect(response).toContain(`</Message></Response>`);
  });
});

describe("For unverified user, generate response", async () => {
  test("Check for right message when the no code is sent", async () => {
    const currentUser = {
      name: "test-better",
      sender: "+4915112341234",
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
          blocked: true,
        },
      },
    });
    expect(response).toContain(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Der Bestätigungscode ist leider falsch. `
    );
    expect(response).toContain(`</Message></Response>`);
  });

  test("Check for right message when a valid code is sent", async () => {
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
            blocked: true,
          },
        },
      }
    );
    expect(response).toBe(`<?xml version="1.0" encoding="UTF-8"?><Response/>`);
  });

  test("Check for right message when an invalid code is sent", async () => {
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
            blocked: true,
          },
        },
      }
    );
    expect(response).toBe(`<?xml version="1.0" encoding="UTF-8"?><Response/>`);
  });
});

describe("For verified users with selected country, generate response", async () => {
  test("Check for right message when bets are blocked", async () => {
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
          blocked: true,
        },
      },
    });
    expect(response).toContain(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, the game is blocked`
    );
    expect(response).toContain(`</Message></Response>`);
  });

  test("Check for right message when a valid bet is placed", async () => {
    const currentUser = {
      name: "test-better",
      sender: "+115112341234",
      recipient: "+4915156785678",
      bet: "test-better",
      stage: Stages.VERIFIED_USER,
    };

    const firstWedge = (process.env.NEXT_PUBLIC_WEDGES || "").split(",")[0];

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
          blocked: false,
        },
        update: async (data: any) => {
          return data;
        },
      },
    });
    expect(response).toContain(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Thank you.`
    );
    expect(response).toContain(`</Message></Response>`);
  });

  test("Check for right message when an invalid bet is placed", async () => {
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
            blocked: false,
          },
          update: async (data: any) => {
            return data;
          },
        },
      }
    );
    expect(response).toEqual(
      `<?xml version="1.0" encoding="UTF-8"?><Response/>`
    );
  });
});

describe("For winner user, generate response", async () => {
  test("Check for right message when the stage is WINNER_UNCLAIMED", async () => {
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
            expect(c.body).toBe(
              process.env.OFFER_SMALL_PRIZES !== "true" // TODO this is not quite working as expected
                ? "Congrats, you already qualified for the prize."
                : "Congrats, you already won. Stop by the Twilio booth to claim your prize!"
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
            blocked: true,
          },
        },
      }
    );
    expect(response).toContain(
      `<?xml version="1.0" encoding="UTF-8"?><Response/>`
    );
  });

  test("Check for right message when the stage is WINNER_CLAIMED", async () => {
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
              "Enjoy your prize. Feel free to visit the Twilio booth"
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
            blocked: true,
          },
        },
      }
    );
    expect(response).toContain(
      `<?xml version="1.0" encoding="UTF-8"?><Response/>`
    );
  });
});

test("Check for right message when the stage is unknown", async () => {
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
            "Entschuldigung, ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut."
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
          blocked: true,
        },
      },
    }
  );
  expect(response).toContain(
    `<?xml version="1.0" encoding="UTF-8"?><Response/>`
  );
});
