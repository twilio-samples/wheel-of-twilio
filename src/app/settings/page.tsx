export const dynamic = "force-dynamic";

import { getSettings } from "../settings";
import { SettingsForm } from "./settings-form";
import { displayFont } from "../fonts";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="h-full overflow-auto relative">
      <div className="mx-4 sm:mx-6 py-8 flex flex-col gap-6 max-w-2xl">
        <header>
          <h1
            className={`text-3xl sm:text-4xl text-[#FDF7F4] ${displayFont.className}`}
          >
            Event settings
          </h1>
          <p className="mt-1 text-sm text-[#B9C3D9]">
            Overrides saved here take effect immediately, without a redeploy.
            Leave a field untouched to keep using its environment variable
            default.
          </p>
        </header>

        <SettingsForm initial={settings} />
      </div>
    </div>
  );
}
