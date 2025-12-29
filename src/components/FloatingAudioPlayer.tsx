import React from 'react';
import { Volume2, VolumeX, ChevronUp } from 'lucide-react';

interface FloatingAudioPlayerProps {
    isPlaying: boolean;
    isMuted: boolean;
    title: string;
    artist: string;
    art: string;
    onToggleMute: () => void;
    onOpenPlayer: () => void;
}

export const FloatingAudioPlayer: React.FC<FloatingAudioPlayerProps> = ({
    isPlaying,
    isMuted,
    title,
    artist,
    art,
    onToggleMute,
    onOpenPlayer,
}) => {
    if (!isPlaying) return null;

    return (
        <div
            className="fixed bottom-20 right-4 z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden"
            style={{ width: '200px' }}
        >
            {/* Mini Album Art */}
            <div className="relative w-full aspect-square">
                <img
                    src={art}
                    alt="Album Art"
                    className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                {/* Track Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-2">
                    <div className="text-white text-xs font-semibold truncate">{title}</div>
                    <div className="text-white/80 text-[10px] truncate">{artist}</div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between p-2 bg-card/95">
                <button
                    onClick={onToggleMute}
                    className="p-1.5 hover:bg-accent rounded-md transition-colors"
                    aria-label={isMuted ? "Unmute" : "Mute"}
                >
                    {isMuted ? (
                        <VolumeX className="w-4 h-4 text-foreground" />
                    ) : (
                        <Volume2 className="w-4 h-4 text-foreground" />
                    )}
                </button>

                <button
                    onClick={onOpenPlayer}
                    className="p-1.5 hover:bg-accent rounded-md transition-colors"
                    aria-label="Open player"
                >
                    <ChevronUp className="w-4 h-4 text-foreground" />
                </button>
            </div>
        </div>
    );
};
