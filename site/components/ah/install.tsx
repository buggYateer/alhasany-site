"use client";

/** Install the site as an app (PWA): the drawer row + a small bar on the home page, like web/app.js. */
import { useSyncExternalStore } from "react";
import { strings } from "@/lib/ah";
import { useLocale } from "next-intl";

type PromptEvent = Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> };
let evt: PromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || !!(navigator as { standalone?: boolean }).standalone;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const dismissed = () => {
  try {
    return localStorage.getItem("installDismissed") === "true";
  } catch {
    return false;
  }
};
const dismiss = () => {
  try {
    localStorage.setItem("installDismissed", "true");
  } catch {}
  emit();
};

if (typeof window !== "undefined") {
  addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    evt = e as PromptEvent;
    emit();
  });
  addEventListener("appinstalled", () => {
    evt = null;
    dismiss();
  });
}

export const canInstall = () => !isStandalone() && (!!evt || isIOS());
export function subscribeInstall(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export async function doInstall(iosText: string) {
  if (evt) {
    evt.prompt();
    const r = await evt.userChoice;
    if (r.outcome === "accepted") dismiss();
    evt = null;
    emit();
    return;
  }
  if (isIOS()) alert(iosText);
}

export function InstallBar() {
  const S = strings(useLocale());
  const show = useSyncExternalStore(subscribeInstall, () => canInstall() && !dismissed(), () => false);
  if (!show) return null;
  return (
    <div id="installBar" className="install-bar">
      <span className="ms" aria-hidden="true">
        add_to_home_screen
      </span>
      <div>
        <b>{S.installTitle}</b>
        <small>{S.installSub}</small>
      </div>
      <button className="ib-go" type="button" onClick={() => doInstall(S.iosInstall)}>
        {S.installGo}
      </button>
      <button className="ib-x" type="button" aria-label={S.close} onClick={dismiss}>
        <span className="ms">close</span>
      </button>
    </div>
  );
}
