/* ── Hero video ──────────────────────────────────────────────────────────
 * Autoplaying, looping, muted YouTube embed for the hero right column.
 *
 * Muted is mandatory: every browser blocks autoplay with sound. The player's
 * own controls are kept, so a visitor can unmute with one click.
 * ─────────────────────────────────────────────────────────────────────── */

type HeroVideoProps = {
  /** YouTube video id (the part after youtu.be/ or watch?v=). */
  videoId: string;
  title?: string;
  className?: string;
};

export default function HeroVideo({
  videoId,
  title = "Creata — how it works",
  className = "",
}: HeroVideoProps) {
  const params = new URLSearchParams({
    autoplay: "1", // start automatically
    mute: "1", // required for autoplay to be allowed; user can unmute
    loop: "1",
    playlist: videoId, // required for loop=1 to work on a single video
    playsinline: "1", // play inline on iOS instead of fullscreen
    rel: "0", // don't show unrelated videos at the end
  });

  return (
    <div
      className={`card-shadow rounded-[28px] bg-white overflow-hidden w-full ${className}`}
    >
      <div className="relative w-full aspect-video bg-black">
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}?${params.toString()}`}
          title={title}
          style={{ border: 0 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </div>
  );
}
