import { MediaType } from "@/stores/media-store";
import { TimelineTrack } from "@/stores/timeline-store";

export type TrackType = "media" | "text" | "audio";

// Base element properties
interface BaseTimelineElement {
  id: string;
  name: string;
  duration: number;
  startTime: number;
  trimStart: number;
  trimEnd: number;
}

// Media element that references MediaStore
export interface MediaElement extends BaseTimelineElement {
  type: "media";
  mediaId: string;
}

// Text element with embedded text data
export interface TextElement extends BaseTimelineElement {
  type: "text";
  content: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string;
  textAlign: "left" | "center" | "right";
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  textDecoration: "none" | "underline" | "line-through";
  x: number; // Position relative to canvas center
  y: number; // Position relative to canvas center
  rotation: number; // in degrees
  opacity: number; // 0-1
}

// Typed timeline elements
export type TimelineElement = MediaElement | TextElement;

// Creation types (without id, for addElementToTrack)
export type CreateMediaElement = Omit<MediaElement, "id">;
export type CreateTextElement = Omit<TextElement, "id">;
export type CreateTimelineElement = CreateMediaElement | CreateTextElement;

export interface TimelineElementProps {
  element: TimelineElement;
  track: TimelineTrack;
  zoomLevel: number;
  isSelected: boolean;
  onElementMouseDown: (e: React.MouseEvent, element: TimelineElement) => void;
  onElementClick: (e: React.MouseEvent, element: TimelineElement) => void;
}

export interface ResizeState {
  elementId: string;
  side: "left" | "right";
  startX: number;
  initialTrimStart: number;
  initialTrimEnd: number;
}

// Drag data types for type-safe drag and drop
export interface MediaItemDragData {
  id: string;
  type: MediaType;
  name: string;
}

export interface TextItemDragData {
  id: string;
  type: "text";
  name: string;
  content: string;
}

export type DragData = MediaItemDragData | TextItemDragData;
