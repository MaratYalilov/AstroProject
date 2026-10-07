import React from "react";
import youtubeIcon from "@/assets/social/youtube.svg?url";
import telegramIcon from "@/assets/social/telegram.svg?url";

const channels = [
  { name: "YouTube", href: "https://www.youtube.com/@HUTBAorg", icon: youtubeIcon },
  { name: "Telegram", href: "https://t.me/HUTBA_News", icon: telegramIcon },
];

export default function SocialLinks({
  showLabels = false,
  onNavigate,
}: {
  showLabels?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="HUTBA в соцсетях">
      {channels.map((channel) => (
        <a
          key={channel.name}
          href={channel.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${channel.name} — HUTBA (откроется в новой вкладке)`}
          title={`${channel.name} — HUTBA`}
          onClick={onNavigate}
          className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--interaction-focus)] ${showLabels ? "px-3 underline decoration-1 underline-offset-4" : "w-10"}`}
        >
          <img
            src={channel.icon}
            alt=""
            aria-hidden="true"
            width={20}
            height={20}
            style={{ width: 20, height: 20, maxWidth: 20, flexShrink: 0 }}
          />
          {showLabels && <span>{channel.name}</span>}
        </a>
      ))}
    </div>
  );
}
