"use client";

import { useRef, useEffect } from "react";
import { usePlaybackStore } from "@/stores/playback-store";

interface VideoPlayerProps {
    src: string;
    poster?: string;
    className?: string;
    clipStartTime: number;
    trimStart: number;
    trimEnd: number;
    clipDuration: number;
}

export function VideoPlayer({
    src,
    poster,
    className = "",
    clipStartTime,
    trimStart,
    trimEnd,
    clipDuration
}: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const { isPlaying, currentTime, volume, speed } = usePlaybackStore();

    // Calculate if we're within this clip's timeline range
    const clipEndTime = clipStartTime + (clipDuration - trimStart - trimEnd);
    const isInClipRange = currentTime >= clipStartTime && currentTime < clipEndTime;

    // Sync playback events
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !isInClipRange) return;

        const handleSeek = (e: CustomEvent) => {
            const timelineTime = e.detail.time;
            const videoTime = Math.max(trimStart, Math.min(
                clipDuration - trimEnd,
                timelineTime - clipStartTime + trimStart
            ));
            video.currentTime = videoTime;
        };

        const handleUpdate = (e: CustomEvent) => {
            const timelineTime = e.detail.time;
            const targetTime = Math.max(trimStart, Math.min(
                clipDuration - trimEnd,
                timelineTime - clipStartTime + trimStart
            ));

            if (Math.abs(video.currentTime - targetTime) > 0.5) {
                video.currentTime = targetTime;
            }
        };

        const handleSpeed = (e: CustomEvent) => {
            video.playbackRate = e.detail.speed;
        };

        window.addEventListener("playback-seek", handleSeek as EventListener);
        window.addEventListener("playback-update", handleUpdate as EventListener);
        window.addEventListener("playback-speed", handleSpeed as EventListener);

        return () => {
            window.removeEventListener("playback-seek", handleSeek as EventListener);
            window.removeEventListener("playback-update", handleUpdate as EventListener);
            window.removeEventListener("playback-speed", handleSpeed as EventListener);
        };
    }, [clipStartTime, trimStart, trimEnd, clipDuration, isInClipRange]);

    // Sync playback state
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isPlaying && isInClipRange) {
            video.play().catch(() => { });
        } else {
            video.pause();
        }
    }, [isPlaying, isInClipRange]);

    // Sync volume and speed
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        video.volume = volume;
        video.playbackRate = speed;
    }, [volume, speed]);

    return (
        <video
            ref={videoRef}
            src={src}
            poster={poster}
            className={`w-full h-full object-cover ${className}`}
            playsInline
            preload="auto"
            controls={false}
            disablePictureInPicture
            disableRemotePlayback
            style={{ pointerEvents: 'none' }}
            onContextMenu={(e) => e.preventDefault()}
        />
    );
} 