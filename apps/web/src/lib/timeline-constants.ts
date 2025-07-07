import type { TrackType } from "@/types/timeline";

// Track color definitions
export const TRACK_COLORS = {
  media: {
    solid: "bg-blue-500",
    background: "bg-blue-500/20",
    border: "border-blue-500/30",
  },
  text: {
    solid: "bg-purple-500",
    background: "bg-purple-500/20",
    border: "border-purple-500/30",
  },
  audio: {
    solid: "bg-green-500",
    background: "bg-green-500/20",
    border: "border-green-500/30",
  },
  default: {
    solid: "bg-gray-500",
    background: "bg-gray-500/20",
    border: "border-gray-500/30",
  },
} as const;

// Utility functions
export function getTrackColors(type: TrackType) {
  return TRACK_COLORS[type] || TRACK_COLORS.default;
}

export function getTrackElementClasses(type: TrackType) {
  const colors = getTrackColors(type);
  return `${colors.background} ${colors.border}`;
}

export function getTrackLabelColor(type: TrackType) {
  return getTrackColors(type).solid;
}

// Other timeline constants
export const TIMELINE_CONSTANTS = {
  ELEMENT_MIN_WIDTH: 80,
  PIXELS_PER_SECOND: 50,
  TRACK_HEIGHT: 60,
  DEFAULT_TEXT_DURATION: 5,
  ZOOM_LEVELS: [0.25, 0.5, 1, 1.5, 2, 3, 4],
} as const;
