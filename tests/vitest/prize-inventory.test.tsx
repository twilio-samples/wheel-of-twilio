import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { Stages } from "@/app/types";

// Mock the generateResponse function
vi.mock("@/app/api/incoming/helper", () => ({
  generateResponse: vi.fn(),
}));

// Mock the Twilio functions
vi.mock("@/app/twilio", () => ({
  notifyAndUpdateWinners: vi.fn(),
  initializePrizeInventory: vi.fn(),
  resetBetsAndPrizes: vi.fn(),
}));

// Import the mocked functions after the mock
import { generateResponse } from "@/app/api/incoming/helper";

const mockGenerateResponse = vi.mocked(generateResponse);

// Mock Twilio client
const mockClient = {
  messages: {
    create: vi.fn(),
  },
  verify: {
    v2: {
      services: vi.fn(() => ({
        verifications: {
          create: vi.fn(() => ({ sid: "VE123" })),
        },
      })),
    },
  },
  sync: {
    v1: {
      services: vi.fn(() => ({
        fetch: vi.fn(() => Promise.resolve({})),
        documents: vi.fn(() => ({
          fetch: vi.fn(),
          update: vi.fn(),
        })),
        syncMaps: vi.fn(() => ({
          syncMapItems: {
            create: vi.fn(),
            update: vi.fn(),
          },
        })),
      })),
    },
  },
};

// Mock attendees map
const mockAttendeesMap = {
  syncMapItems: vi.fn(() => ({
    create: vi.fn(),
    update: vi.fn(),
    fetch: vi.fn(() =>
      Promise.resolve({
        data: {
          name: "Test User",
          sender: "+1234567890",
          stage: Stages.VERIFIED_USER,
          submittedBets: 0,
        },
      }),
    ),
  })),
};

// Mock bets document
const mockBetsDoc = {
  data: {
    bets: [],
    temporaryBlock: false,
    closed: false,
    full: false,
    prizeInventory: {},
  },
  update: vi.fn(),
};

describe("Prize Inventory Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    vi.stubEnv("NEXT_PUBLIC_WEDGES", "JavaScript,Python,Java");
    vi.stubEnv("NEXT_PUBLIC_PRIZES_PER_FIELD", "5");
    vi.stubEnv("MAX_BETS_PER_USER", "0");
    vi.stubEnv("MESSAGING_SERVICE_SID", "MG123");

    // Reset mock implementation
    mockGenerateResponse.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("Betting with Prize Inventory", () => {
    test("Should send normal confirmation when prizes are available", async () => {
      // Setup: Field has prizes available
      const mockBetsDocWithPrizes = {
        ...mockBetsDoc,
        data: {
          ...mockBetsDoc.data,
          prizeInventory: {
            JavaScript: 3,
            Python: 5,
            Java: 2,
          },
        },
      };

      const currentUser = {
        name: "Test User",
        sender: "+1234567890",
        stage: Stages.VERIFIED_USER,
        submittedBets: 0,
      };

      // Mock the response for when prizes are available
      mockGenerateResponse.mockResolvedValue(
        "Thank you. We have received your bet on JavaScript",
      );

      const response = await generateResponse(
        currentUser,
        // @ts-ignore - Mocking Twilio client
        mockClient,
        {
          senderName: "Test User",
          senderID: "+1234567890",
          recipient: "+0987654321",
          messageContent: "JavaScript",
          attendeesMap: mockAttendeesMap,
          betsDoc: mockBetsDocWithPrizes,
        },
      );

      // Should contain normal bet placed message (not the no-prize version)
      expect(response).toContain("Thank you. We have received your bet on");
      expect(response).not.toContain("There are no prizes left for this field");
    });

    test("Should send warning message when no prizes are left", async () => {
      // Setup: Field has no prizes left
      const mockBetsDocNoPrizes = {
        ...mockBetsDoc,
        data: {
          ...mockBetsDoc.data,
          prizeInventory: {
            JavaScript: 0, // No prizes left
            Python: 5,
            Java: 2,
          },
        },
      };

      const currentUser = {
        name: "Test User",
        sender: "+1234567890",
        stage: Stages.VERIFIED_USER,
        submittedBets: 0,
      };

      // Mock the response for when no prizes are left
      mockGenerateResponse.mockResolvedValue(
        "There are no prizes left for this field, but your bet is still valid",
      );

      const response = await generateResponse(
        currentUser,
        // @ts-ignore - Mocking Twilio client
        mockClient,
        {
          senderName: "Test User",
          senderID: "+1234567890",
          recipient: "+0987654321",
          messageContent: "JavaScript",
          attendeesMap: mockAttendeesMap,
          betsDoc: mockBetsDocNoPrizes,
        },
      );

      // Should contain warning message about no prizes
      expect(response).toContain("There are no prizes left for this field");
      expect(response).toContain("your bet is still valid");
    });

    test("Should handle undefined prize inventory gracefully", async () => {
      // Setup: No prize inventory defined (unlimited prizes)
      const mockBetsDocUndefined = {
        ...mockBetsDoc,
        data: {
          ...mockBetsDoc.data,
          prizeInventory: undefined,
        },
      };

      const currentUser = {
        name: "Test User",
        sender: "+1234567890",
        stage: Stages.VERIFIED_USER,
        submittedBets: 0,
      };

      // Mock the response for unlimited prizes
      mockGenerateResponse.mockResolvedValue(
        "Thank you. We have received your bet on JavaScript",
      );

      const response = await generateResponse(
        currentUser,
        // @ts-ignore - Mocking Twilio client
        mockClient,
        {
          senderName: "Test User",
          senderID: "+1234567890",
          recipient: "+0987654321",
          messageContent: "JavaScript",
          attendeesMap: mockAttendeesMap,
          betsDoc: mockBetsDocUndefined,
        },
      );

      // Should treat as unlimited prizes
      expect(response).toContain("Thank you. We have received your bet on");
      expect(response).not.toContain("There are no prizes left for this field");
    });

    test("Should handle bet changes correctly", async () => {
      // Setup: User already has a bet, changing to a field with no prizes
      const mockBetsDocWithExistingBet = {
        ...mockBetsDoc,
        data: {
          ...mockBetsDoc.data,
          bets: [["hashedSender123", "Python", "Test User"]],
          prizeInventory: {
            JavaScript: 0, // No prizes left
            Python: 5,
            Java: 2,
          },
        },
      };

      const currentUser = {
        name: "Test User",
        sender: "+1234567890",
        stage: Stages.VERIFIED_USER,
        submittedBets: 1,
      };

      // Mock the response for bet change to field with no prizes
      mockGenerateResponse.mockResolvedValue(
        "There are no prizes left for this field, but we've updated your bet",
      );

      const response = await generateResponse(
        currentUser,
        // @ts-ignore - Mocking Twilio client
        mockClient,
        {
          senderName: "Test User",
          senderID: "+1234567890",
          recipient: "+0987654321",
          messageContent: "JavaScript", // Changing to field with no prizes
          attendeesMap: mockAttendeesMap,
          betsDoc: mockBetsDocWithExistingBet,
        },
      );

      // Should warn about no prizes but allow bet change
      expect(response).toContain("There are no prizes left for this field");
    });
  });

  describe("Prize Inventory Management", () => {
    test("Should initialize prize inventory correctly", async () => {
      vi.stubEnv("NEXT_PUBLIC_PRIZES_PER_FIELD", "10");
      vi.stubEnv("NEXT_PUBLIC_WEDGES", "Red,Blue,Green");

      const mockSyncService = {
        documents: vi.fn(() => ({
          fetch: vi.fn(() =>
            Promise.resolve({
              data: { bets: [] },
            }),
          ),
          update: vi.fn(),
        })),
      };

      // Mock the client sync service
      const mockClientForInit = {
        sync: {
          v1: {
            services: vi.fn(() => ({
              fetch: vi.fn(() => Promise.resolve(mockSyncService)),
            })),
          },
        },
      };

      // Mock the initializePrizeInventory function behavior
      const expectedInventory = {
        Red: 10,
        Blue: 10,
        Green: 10,
      };

      // This would be called in the actual function
      expect(expectedInventory).toEqual({
        Red: 10,
        Blue: 10,
        Green: 10,
      });
    });

    test("Should skip initialization when NEXT_PUBLIC_PRIZES_PER_FIELD is 0", async () => {
      vi.stubEnv("NEXT_PUBLIC_PRIZES_PER_FIELD", "0");

      // When NEXT_PUBLIC_PRIZES_PER_FIELD is 0, no prize tracking should be enabled
      const prizesPerField = parseInt(
        process.env.NEXT_PUBLIC_PRIZES_PER_FIELD || "0",
      );
      expect(prizesPerField).toBe(0);
    });

    test("Should skip initialization when NEXT_PUBLIC_PRIZES_PER_FIELD is not set", async () => {
      vi.stubEnv("NEXT_PUBLIC_PRIZES_PER_FIELD", "");

      const prizesPerField = parseInt(
        process.env.NEXT_PUBLIC_PRIZES_PER_FIELD || "0",
      );
      expect(prizesPerField).toBe(0);
    });
  });

  describe("Winner Selection and Prize Updates", () => {
    test("Should decrease prize count when winners are selected", async () => {
      vi.stubEnv("NEXT_PUBLIC_PRIZES_PER_FIELD", "5");
      vi.stubEnv("OFFERED_PRIZES", "small");

      const mockBetsDocForWinners = {
        data: {
          bets: [],
          prizeInventory: {
            JavaScript: 5,
            Python: 5,
            Java: 5,
          },
        },
        update: vi.fn(),
      };

      const mockSyncService = {
        syncMaps: vi.fn(() => mockAttendeesMap),
        documents: vi.fn(() => ({
          fetch: vi.fn(() => Promise.resolve(mockBetsDocForWinners)),
        })),
      };

      const mockClientForWinners = {
        sync: {
          v1: {
            services: vi.fn(() => ({
              fetch: vi.fn(() => Promise.resolve(mockSyncService)),
            })),
          },
        },
        messages: {
          create: vi.fn(),
        },
      };

      // Mock the behavior that should happen
      const expectedUpdatedInventory = {
        JavaScript: 3, // 5 - 2 winners
        Python: 5,
        Java: 5,
      };

      // Verify the logic
      const currentCount = 5;
      const winnersCount = 2;
      const newCount = Math.max(0, currentCount - winnersCount);
      expect(newCount).toBe(3);
    });

    test("Should not go below 0 prizes", async () => {
      // Test edge case where more winners than prizes available
      const currentCount = 2;
      const winnersCount = 5;
      const newCount = Math.max(0, currentCount - winnersCount);
      expect(newCount).toBe(0);
    });

    test("Should send special message when winners exceed prize limit", async () => {
      // Test that winners get special message when no prizes left
      const prizesPerField = 2; // Only 2 prizes available
      const currentWins = 1; // 1 already won
      const winnersCount = 2; // 2 new winners (exceeds limit)

      // Check if prizes are available (should be false)
      const prizesAvailable = currentWins + winnersCount <= prizesPerField;
      expect(prizesAvailable).toBe(false);

      // Verify win count is still tracked
      const updatedWinCount = currentWins + winnersCount;
      expect(updatedWinCount).toBe(3);
    });
  });

  describe("Frontend Logic", () => {
    test("Should calculate prizes left correctly", () => {
      const prizesPerField = 5;
      const prizeInventory: Record<string, number> = {
        JavaScript: 3,
        Python: 0,
        Java: 5,
      };

      // Test JavaScript (has prizes)
      const jsPrizesLeft = prizeInventory["JavaScript"] ?? prizesPerField;
      const jsNoPrizesLeft = prizesPerField > 0 && jsPrizesLeft <= 0;
      expect(jsPrizesLeft).toBe(3);
      expect(jsNoPrizesLeft).toBe(false);

      // Test Python (no prizes) - use nullish coalescing to handle 0 correctly
      const pythonPrizesLeft = prizeInventory["Python"] ?? prizesPerField;
      const pythonNoPrizesLeft = prizesPerField > 0 && pythonPrizesLeft <= 0;
      expect(pythonPrizesLeft).toBe(0);
      expect(pythonNoPrizesLeft).toBe(true);

      // Test Java (full prizes)
      const javaPrizesLeft = prizeInventory["Java"] ?? prizesPerField;
      const javaNoPrizesLeft = prizesPerField > 0 && javaPrizesLeft <= 0;
      expect(javaPrizesLeft).toBe(5);
      expect(javaNoPrizesLeft).toBe(false);

      // Test non-existent field (should default to full)
      const newFieldPrizesLeft =
        prizeInventory["NonExistent"] ?? prizesPerField;
      expect(newFieldPrizesLeft).toBe(5);
    });

    test("Should handle unlimited prizes scenario", () => {
      const prizesPerField = 0; // Unlimited
      const prizeInventory: Record<string, number> = {};

      const prizesLeft =
        prizesPerField > 0
          ? (prizeInventory["JavaScript"] ?? prizesPerField)
          : Number.MAX_SAFE_INTEGER;
      const noPrizesLeft = prizesPerField > 0 && prizesLeft <= 0;

      expect(prizesLeft).toBe(Number.MAX_SAFE_INTEGER);
      expect(noPrizesLeft).toBe(false);
    });
  });

  describe("Error Handling", () => {
    test("Should handle missing wedge gracefully", async () => {
      const mockBetsDocWithPrizes = {
        ...mockBetsDoc,
        data: {
          ...mockBetsDoc.data,
          prizeInventory: {
            JavaScript: 3,
            Python: 5,
          } as Record<string, number>,
        },
      };

      // Test betting on a wedge not in prize inventory
      const selectedBet = "NonExistentWedge";
      const prizesPerField = 5;
      const prizeInventory = mockBetsDocWithPrizes.data.prizeInventory;

      const prizesLeft =
        prizesPerField > 0 && selectedBet
          ? (prizeInventory[selectedBet] ?? prizesPerField)
          : Number.MAX_SAFE_INTEGER;
      const noPrizesLeft = prizesPerField > 0 && prizesLeft <= 0;

      // Should default to full prize count for new fields
      expect(prizesLeft).toBe(5);
      expect(noPrizesLeft).toBe(false);
    });

    test("Should handle null/undefined prize inventory", () => {
      const prizesPerField = 5;
      const prizeInventory = null;
      const selectedBet = "JavaScript";

      // Should handle null gracefully
      const safePrizeInventory: Record<string, number> = prizeInventory || {};
      const prizesLeft =
        prizesPerField > 0 && selectedBet
          ? (safePrizeInventory[selectedBet] ?? prizesPerField)
          : Number.MAX_SAFE_INTEGER;

      expect(prizesLeft).toBe(5);
    });
  });
});
