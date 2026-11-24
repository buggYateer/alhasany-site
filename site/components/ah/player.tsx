"use client";

/** The player bar — the markup of #player in web/index.html, driven by PlayerProvider. */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SPEEDS, usePlayer } from "@/components/player/player-provider";
import { Link } from "@/i18n/navigation";
import { fmtTime } from "@/lib/text";
import { KIND_ICON, TG_PATH, toneClass } from "@/lib/ah";
import { LessonCover } from "./cover";
import { useS } from "./list";
import { withLocale } from "./page-head";
import { useLocale } from "next-intl";

const TG = (
  <svg viewBox="0 0 24 24">
    <path d={TG_PATH} />
  </svg>
);

const fineQuery = "(hover:hover) and (pointer:fine)";
const subFine = (cb: () => void) => {
  const m = matchMedia(fineQuery);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
/** iPhone doesn't let a page change the volume, so the control is hidden there. */
const volumeWorks = () => {
  const a = new Audio();
  a.volume = 0.5;
  return a.volume === 0.5;
};

export function AhPlayer() {
  const p = usePlayer();
  const S = useS();
  const cur = p.current;
  const [time, setTime] = useState({ t: 0, d: 0 });
  const [speedOpen, setSpeedOpen] = useState(false);
  const [volOpen, setVolOpen] = useState(false);
  const fine = useSyncExternalStore(subFine, () => matchMedia(fineQuery).matches, () => true);
  const canVol = useSyncExternalStore(
    () => () => {},
    volumeWorks,
    () => true,
  );
  const lastVol = useRef(100);
  const volEl = useRef<HTMLInputElement>(null);
  const drag = useRef(false);

  useEffect(() => {
    const a = p.audio.current;
    if (!a) return;
    const tick = () => setTime({ t: a.currentTime, d: a.duration || 0 });
    a.addEventListener("timeupdate", tick);
    a.addEventListener("loadedmetadata", tick);
    return () => {
      a.removeEventListener("timeupdate", tick);
      a.removeEventListener("loadedmetadata", tick);
    };
  }, [p.audio]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Element;
      if (!t.closest(".speed")) setSpeedOpen(false);
      if (!t.closest(".vol")) setVolOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (document.getElementById("drawer")?.hidden === false) return;
      setSpeedOpen((o) => {
        if (!o) p.setExpanded(false);
        return false;
      });
    };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [p]);

  const vol = Math.round(p.volume * 100);
  const setVol = (v: number) => {
    v = Math.max(0, Math.min(100, Math.round(v)));
    if (v > 0) lastVol.current = v;
    p.setVolume(v / 100);
  };
  const toggleMute = () => {
    if (vol > 0) lastVol.current = vol;
    setVol(vol === 0 ? lastVol.current || 60 : 0);
  };
  const volAt = (y: number) => {
    const r = volEl.current!.getBoundingClientRect();
    setVol(((r.bottom - y) / r.height) * 100);
  };

  const seek = time.d ? (time.t / time.d) * 1000 : 0;
  const sh = cur?.sh;
  const se = cur?.se;
  const playing = p.playing;
  const locale = useLocale();
  const share = withLocale(locale, cur ? `/l/${cur.id}` : "/");

  return (
    <div className={`player${p.expanded ? " expanded" : ""}`} id="player" hidden={!cur}
      onClick={(e) => {
        if (p.expanded) return;
        if ((e.target as Element).closest("button, a, input, .speed-menu, .vol-pop")) return;
        p.setExpanded(true);
      }}
    >
      <div className="pl-inner">
        <div className="pl-top">
          <button className="pl-min" id="plMin" hidden={!p.expanded} aria-label={S.minimize} onClick={() => p.setExpanded(false)}>
            <span className="ms">keyboard_arrow_down</span>
          </button>
          <span>{S.nowPlaying}</span>
        </div>
        <div className="pl-now">
          <div className="pl-art" id="plArt" aria-hidden="true">
            {cur ? (
              <>
                <div className={`art-mini ${toneClass(cur)}`}>
                  <span className="ms">{KIND_ICON[cur.k] || "graphic_eq"}</span>
                </div>
                <LessonCover it={cur} S={S} />
              </>
            ) : null}
          </div>
          <div className="pl-info">
            <div className="pl-title" id="plTitle">
              {cur ? (cur.n ? `${cur.n}. ` : "") + cur.t : ""}
            </div>
            <div className="pl-sub" id="plSub">
              {p.error ? (
                S.fileMissing
              ) : sh ? (
                <>
                  <Link href={`/s/${sh.slug}`}>
                    {S.sheikh} {sh.name}
                  </Link>
                  {se ? (
                    <>
                      {" — "}
                      <Link href={`/s/${sh.slug}/${se.key}`}>{se.title}</Link>
                    </>
                  ) : null}
                </>
              ) : (
                S.siteName
              )}
            </div>
          </div>
          <div className="pl-side">
            <div className="pl-knobs">
              <div className="speed">
                <button
                  className="pl-speed"
                  id="plSpeed"
                  aria-haspopup="menu"
                  aria-expanded={speedOpen}
                  aria-label={S.speed}
                  onClick={(e) => {
                    e.stopPropagation();
                    setVolOpen(false);
                    setSpeedOpen((o) => !o);
                  }}
                >
                  {p.speed}×
                </button>
                <div className="speed-menu" id="speedMenu" role="menu" hidden={!speedOpen}>
                  {SPEEDS.map((x) => (
                    <button
                      key={x}
                      role="menuitemradio"
                      aria-checked={x === p.speed}
                      onClick={() => {
                        p.setSpeed(x);
                        setSpeedOpen(false);
                      }}
                    >
                      {x}×
                    </button>
                  ))}
                </div>
              </div>
              <div className="vol" id="plVolWrap" hidden={!canVol}
                onWheel={(e) => setVol(vol - Math.sign(e.deltaY) * 5)}
              >
                <button
                  className="pl-tg pl-vol"
                  id="plVolBtn"
                  aria-haspopup="true"
                  aria-expanded={volOpen}
                  aria-label={fine ? (vol === 0 ? S.unmute : S.mute) : S.volume}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSpeedOpen(false);
                    if (fine) toggleMute();
                    else setVolOpen((o) => !o);
                  }}
                >
                  <span className="ms" id="plVolIcon">
                    {vol === 0 ? "volume_off" : vol < 50 ? "volume_down" : "volume_up"}
                  </span>
                </button>
                <div
                  className="vol-pop"
                  id="plVolPop"
                  hidden={!volOpen}
                  onPointerDown={(e) => {
                    if ((e.target as Element).closest(".vol-mute")) return;
                    e.preventDefault();
                    drag.current = true;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    volAt(e.clientY);
                  }}
                  onPointerMove={(e) => {
                    if (drag.current) {
                      e.preventDefault();
                      volAt(e.clientY);
                    }
                  }}
                  onPointerUp={() => (drag.current = false)}
                  onPointerCancel={() => (drag.current = false)}
                >
                  <input
                    ref={volEl}
                    type="range"
                    id="plVol"
                    min={0}
                    max={100}
                    value={vol}
                    aria-label={S.volume}
                    aria-orientation="vertical"
                    style={{ "--p": `${vol}%` } as React.CSSProperties}
                    onChange={(e) => setVol(+e.target.value)}
                  />
                  <button
                    className="vol-mute"
                    id="plMute"
                    aria-label={vol === 0 ? S.unmute : S.mute}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMute();
                    }}
                  >
                    <span className="ms">{vol === 0 ? "volume_up" : "volume_off"}</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="pl-acts">
              <button className="pl-tg pl-share" id="plShare" data-share={share} data-title={cur?.t ?? ""} aria-label={S.share}>
                <span className="ms">share</span>
              </button>
              <a
                className="pl-tg pl-dl"
                id="plDl"
                href={cur ? p.downloadUrl(cur.id) : "#"}
                title={S.download}
                aria-label={S.downloadClip}
                onClick={(e) => {
                  if (!cur || cur.p <= 1) return;
                  e.preventDefault();
                  for (let k = 1; k <= cur.p; k++)
                    setTimeout(() => {
                      const a = document.createElement("a");
                      a.href = p.downloadUrl(cur.id, k);
                      a.download = "";
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                    }, (k - 1) * 900);
                }}
              >
                <span className="ms">download</span>
              </a>
              <a className="pl-tg" id="plTg" href={cur ? p.telegramUrl(cur.id) : undefined} target="_blank" rel="noopener" aria-label={S.openTg} title={S.openTg}>
                {TG}
              </a>
              <button className="pl-close" id="plClose" aria-label={S.closePlayer} onClick={p.close}>
                <span className="ms">close</span>
              </button>
            </div>
          </div>
        </div>
        <div className="pl-center" dir="ltr">
          <div className="pl-seekrow">
            <span id="plTime">{fmtTime(time.t)}</span>
            <input
              type="range"
              id="plSeek"
              min={0}
              max={1000}
              value={seek}
              aria-label={S.progress}
              style={{ "--p": `${seek / 10}%` } as React.CSSProperties}
              onChange={(e) => p.seekTo(+e.target.value / 1000)}
            />
            <span id="plDur">{fmtTime(time.d)}</span>
          </div>
          <div className="pl-ctrls">
            <a className="pl-btn pl-edge" id="plTg2" href={cur ? p.telegramUrl(cur.id) : undefined} target="_blank" rel="noopener" aria-label={S.openTg}>
              {TG}
            </a>
            <button className="pl-btn" id="plPrev" aria-label={S.prev} onClick={() => p.step(-1)}>
              <span className="ms">skip_previous</span>
            </button>
            <button className="pl-btn" id="plBack" aria-label={S.back10} onClick={() => p.seekBy(-10)}>
              <span className="ms">replay_10</span>
            </button>
            <button className="pl-btn pl-main" id="plPlay" aria-label={playing ? S.pause : S.play} onClick={p.toggle}>
              <span className="ms" id="plIcon">
                {playing ? "pause" : "play_arrow"}
              </span>
            </button>
            <button className="pl-btn" id="plFwd" aria-label={S.fwd10} onClick={() => p.seekBy(10)}>
              <span className="ms">forward_10</span>
            </button>
            <button className="pl-btn" id="plNext" aria-label={S.next} onClick={() => p.step(1)}>
              <span className="ms">skip_next</span>
            </button>
            <button className="pl-btn pl-edge" id="plShare2" data-share={share} data-title={cur?.t ?? ""} aria-label={S.share}>
              <span className="ms">share</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
