"use client";

/** The buttons of a recording page: listen / download / share / Telegram (lp-actions in web/app.js). */
import type { ReactNode } from "react";
import { usePlayer } from "@/components/player/player-provider";
import type { Item } from "@/lib/library";
import { TgSvg, useS } from "./list";

export function LessonActions({ it, share }: { it: Item; share: ReactNode }) {
  const p = usePlayer();
  const S = useS();
  return (
    <div className="lp-actions">
      {it.p ? (
        <>
          <button className="big-play" onClick={() => p.play(it, [it])}>
            <span className="ms" aria-hidden="true">
              play_arrow
            </span>
            <span>{S.listen}</span>
          </button>
          <a
            className="lp-btn"
            href={p.downloadUrl(it.id)}
            onClick={(e) => {
              if (it.p <= 1) return;
              e.preventDefault();
              for (let k = 1; k <= it.p; k++)
                setTimeout(() => {
                  const a = document.createElement("a");
                  a.href = p.downloadUrl(it.id, k);
                  a.download = "";
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                }, (k - 1) * 900);
            }}
          >
            <span className="ms" aria-hidden="true">
              download
            </span>
            {S.download}
          </a>
        </>
      ) : null}
      {share}
      <a className="lp-btn" href={p.telegramUrl(it.id)} target="_blank" rel="noopener">
        <TgSvg />
        {S.telegram}
      </a>
    </div>
  );
}
