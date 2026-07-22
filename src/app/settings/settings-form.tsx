"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { saveSettings, resetSettings } from "../settings";
import { Settings } from "../types";

const toggleItemClassName =
  "border border-[#24365F] bg-[#0B1B3E] text-[#B9C3D9] hover:bg-[#12275A] hover:text-[#FDF7F4] data-[state=on]:bg-[#EF223A] data-[state=on]:text-[#FDF7F4]";

const LEAD_COLLECTION_OPTIONS: { value: Settings["leadCollection"]; label: string }[] = [
  { value: "MANUAL", label: "Manual (name + email + OTP)" },
  { value: "QR", label: "QR badge scan" },
  { value: "NONE", label: "None" },
];

// Radix ToggleGroup reports "" both when a real option has value="" and when
// the pressed item is clicked again to deselect it — those two cases are
// indistinguishable. Use a non-empty sentinel for "None" and translate at
// the read/write boundary instead.
type OfferedPrizesUiValue = "none" | "small" | "big" | "both";

const OFFERED_PRIZES_OPTIONS: { value: OfferedPrizesUiValue; label: string }[] = [
  { value: "none", label: "None" },
  { value: "small", label: "Small prize" },
  { value: "big", label: "Raffle" },
  { value: "both", label: "Both" },
];

function toUiOfferedPrizes(value: Settings["offeredPrizes"]): OfferedPrizesUiValue {
  return value === "" ? "none" : value;
}

function fromUiOfferedPrizes(value: OfferedPrizesUiValue): Settings["offeredPrizes"] {
  return value === "none" ? "" : value;
}

function fieldLabelClassName() {
  return "text-xs uppercase tracking-[0.15em] text-[#7C89AC]";
}

export function SettingsForm({ initial }: { initial: Settings }) {
  const [wedgesText, setWedgesText] = useState(initial.wedges.join(", "));
  const [eventName, setEventName] = useState(initial.eventName);
  const [hideQrCode, setHideQrCode] = useState(initial.hideQrCode);
  const [prizesPerField, setPrizesPerField] = useState(initial.prizesPerField);
  const [offeredPrizes, setOfferedPrizes] = useState<OfferedPrizesUiValue>(
    toUiOfferedPrizes(initial.offeredPrizes),
  );
  const [smallPrizesText, setSmallPrizesText] = useState(initial.smallPrizes.join(", "));
  const [leadCollection, setLeadCollection] = useState(initial.leadCollection);
  const [maxBetsPerUser, setMaxBetsPerUser] = useState(initial.maxBetsPerUser);

  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [isPending, startTransition] = useTransition();

  const wedgeCount = wedgesText
    .split(",")
    .map((w) => w.trim())
    .filter((w) => w !== "").length;

  function handleSave() {
    setStatus({ kind: "saving" });
    const settings: Settings = {
      wedges: wedgesText.split(","),
      eventName,
      hideQrCode,
      prizesPerField,
      offeredPrizes: fromUiOfferedPrizes(offeredPrizes),
      smallPrizes: smallPrizesText.split(","),
      leadCollection,
      maxBetsPerUser,
    };
    startTransition(async () => {
      try {
        const saved = await saveSettings(settings);
        setWedgesText(saved.wedges.join(", "));
        setSmallPrizesText(saved.smallPrizes.join(", "));
        setStatus({ kind: "saved" });
      } catch (e: any) {
        setStatus({ kind: "error", message: e.message || "Failed to save settings" });
      }
    });
  }

  function handleReset() {
    setStatus({ kind: "saving" });
    startTransition(async () => {
      try {
        const defaults = await resetSettings();
        setWedgesText(defaults.wedges.join(", "));
        setEventName(defaults.eventName);
        setHideQrCode(defaults.hideQrCode);
        setPrizesPerField(defaults.prizesPerField);
        setOfferedPrizes(toUiOfferedPrizes(defaults.offeredPrizes));
        setSmallPrizesText(defaults.smallPrizes.join(", "));
        setLeadCollection(defaults.leadCollection);
        setMaxBetsPerUser(defaults.maxBetsPerUser);
        setStatus({ kind: "saved" });
      } catch (e: any) {
        setStatus({ kind: "error", message: e.message || "Failed to reset settings" });
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className={fieldLabelClassName()}>Event name</label>
        <Input value={eventName} onChange={(e) => setEventName(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <label className={fieldLabelClassName()}>
          Wedges &middot; {wedgeCount} configured
        </label>
        <Textarea
          value={wedgesText}
          onChange={(e) => setWedgesText(e.target.value)}
          placeholder="San Francisco, London, Paris, ..."
        />
        <p className="text-xs text-[#7C89AC]">8 wedges recommended for a balanced wheel.</p>
      </div>

      <div className="flex flex-col gap-2">
        <label className={fieldLabelClassName()}>Lead collection mode</label>
        <ToggleGroup
          type="single"
          value={leadCollection}
          onValueChange={(value) => value && setLeadCollection(value as Settings["leadCollection"])}
        >
          {LEAD_COLLECTION_OPTIONS.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              aria-label={option.label}
              className={toggleItemClassName}
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex flex-col gap-2">
        <label className={fieldLabelClassName()}>Offered prizes</label>
        <ToggleGroup
          type="single"
          value={offeredPrizes}
          onValueChange={(value) => value && setOfferedPrizes(value as OfferedPrizesUiValue)}
        >
          {OFFERED_PRIZES_OPTIONS.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              aria-label={option.label}
              className={toggleItemClassName}
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex flex-col gap-2">
        <label className={fieldLabelClassName()}>Small prize pool</label>
        <Textarea
          value={smallPrizesText}
          onChange={(e) => setSmallPrizesText(e.target.value)}
          placeholder="Twilio Sticker Pack, ..."
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className={fieldLabelClassName()}>Prizes per wedge &middot; 0 = unlimited</label>
          <Input
            type="number"
            min={0}
            value={prizesPerField}
            onChange={(e) => setPrizesPerField(parseInt(e.target.value || "0", 10))}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={fieldLabelClassName()}>Max bets per user &middot; 0 = unlimited</label>
          <Input
            type="number"
            min={0}
            value={maxBetsPerUser}
            onChange={(e) => setMaxBetsPerUser(parseInt(e.target.value || "0", 10))}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className={fieldLabelClassName()}>QR code on wheel screen</label>
        <ToggleGroup
          type="single"
          value={hideQrCode ? "hide" : "show"}
          onValueChange={(value) => value && setHideQrCode(value === "hide")}
        >
          <ToggleGroupItem value="show" aria-label="Show" className={toggleItemClassName}>
            Show
          </ToggleGroupItem>
          <ToggleGroupItem value="hide" aria-label="Hide" className={toggleItemClassName}>
            Hide
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={handleSave}
          disabled={isPending}
          className="bg-[#EF223A] text-[#FDF7F4] hover:bg-[#EF223A]/90"
        >
          Save changes
        </Button>
        <Button
          onClick={handleReset}
          disabled={isPending}
          variant="outline"
          className="border-[#24365F] bg-[#0B1B3E] text-[#B9C3D9] hover:bg-[#12275A] hover:text-[#FDF7F4]"
        >
          Reset to environment defaults
        </Button>

        {status.kind === "saving" && <span className="text-sm text-[#B9C3D9]">Saving…</span>}
        {status.kind === "saved" && <span className="text-sm text-[#7CFFB2]">Saved</span>}
        {status.kind === "error" && (
          <span className="text-sm text-[#EF223A]">{status.message}</span>
        )}
      </div>
    </div>
  );
}
