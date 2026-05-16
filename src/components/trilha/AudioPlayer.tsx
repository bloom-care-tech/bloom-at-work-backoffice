import { useEffect, useRef, useState } from "react";
import { Pause, Play, SpeakerHigh } from "@phosphor-icons/react";

import "./audio-player.css";

const formatTime = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const WAVE_BARS = Array.from({ length: 42 }, (_, i) => {
  const v = Math.sin(i * 0.7) * 0.4 + Math.cos(i * 1.3) * 0.3 + 0.6;
  return Math.max(0.18, Math.min(1, Math.abs(v)));
});

/** Trilha / WaveTrilha audio card — shared UI for Bloom@Work and backoffice preview. */
export function AudioPlayer({ titulo, src }: { titulo: string; src?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const hasRealSrc = !!src && src !== "#";

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrent(a.currentTime);
    const onDur = () => setDuration(a.duration || 0);
    const onEnd = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onDur);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onDur);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  useEffect(() => {
    if (hasRealSrc || !playing) return;
    const total = 240;
    setDuration(total);
    const id = setInterval(() => {
      setCurrent((c) => {
        if (c + 0.25 >= total) {
          setPlaying(false);
          return 0;
        }
        return c + 0.25;
      });
    }, 250);
    return () => clearInterval(id);
  }, [playing, hasRealSrc]);

  const toggle = () => {
    if (hasRealSrc && audioRef.current) {
      if (playing) audioRef.current.pause();
      else void audioRef.current.play();
    }
    setPlaying((p) => !p);
  };

  const progress = duration > 0 ? current / duration : 0;
  const activeBars = Math.round(progress * WAVE_BARS.length);

  return (
    <div className="bloom-audio-player">
      {hasRealSrc && <audio ref={audioRef} className="bloom-audio-player__media" src={src} preload="metadata" />}
      <div className="bloom-audio-player__meta-row">
        <SpeakerHigh size={14} weight="duotone" className="bloom-audio-player__meta-icon" aria-hidden />
        <p className="bloom-audio-player__eyebrow">{playing ? "Tocando agora" : "Reflexão guiada"}</p>
      </div>
      <p className="bloom-audio-player__title">{titulo}</p>

      <div className="bloom-audio-player__controls">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pausar" : "Tocar"}
          className="bloom-audio-player__play"
        >
          {playing ? (
            <Pause size={18} weight="fill" aria-hidden />
          ) : (
            <Play size={18} weight="fill" className="bloom-audio-player__play-triangle" aria-hidden />
          )}
        </button>

        <div className="bloom-audio-player__wave-col">
          <div className="bloom-audio-player__bars">
            {WAVE_BARS.map((h, i) => {
              const isPast = i < activeBars;
              const isPulse = playing && i >= activeBars - 2 && i <= activeBars + 2;
              return (
                <span
                  key={i}
                  className={`bloom-audio-player__bar ${isPast ? "bloom-audio-player__bar--past" : "bloom-audio-player__bar--future"}${isPulse ? " bloom-audio-player__bar--pulse" : ""}`}
                  style={{
                    height: `${h * 100}%`,
                  }}
                />
              );
            })}
          </div>
          <div className="bloom-audio-player__times">
            <span>{formatTime(current)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
