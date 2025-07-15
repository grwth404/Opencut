// Type declarations for external modules without @types packages

declare module 'lucide-react' {
  import { FC, SVGProps } from 'react';
  
  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: string | number;
    strokeWidth?: string | number;
  }
  
  export const Scissors: FC<IconProps>;
  export const ArrowLeftToLine: FC<IconProps>;
  export const ArrowRightToLine: FC<IconProps>;
  export const Trash2: FC<IconProps>;
  export const Snowflake: FC<IconProps>;
  export const Copy: FC<IconProps>;
  export const SplitSquareHorizontal: FC<IconProps>;
  export const Pause: FC<IconProps>;
  export const Play: FC<IconProps>;
  export const Video: FC<IconProps>;
  export const Music: FC<IconProps>;
  export const TypeIcon: FC<IconProps>;
  export const Magnet: FC<IconProps>;
  export const Lock: FC<IconProps>;
  export const ChevronLeft: FC<IconProps>;
  export const Download: FC<IconProps>;
  export const Keyboard: FC<IconProps>;
  export const SkipBack: FC<IconProps>;
  export const SkipForward: FC<IconProps>;
  // Add other icons as needed
}

declare module 'sonner' {
  export interface ToastOptions {
    duration?: number;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
    style?: React.CSSProperties;
    className?: string;
    description?: string;
    action?: {
      label: string;
      onClick: () => void;
    };
    cancel?: {
      label: string;
      onClick?: () => void;
    };
    id?: string | number;
    onDismiss?: (toast: any) => void;
    onAutoClose?: (toast: any) => void;
  }

  export interface Toast {
    success: (message: string, options?: ToastOptions) => void;
    error: (message: string, options?: ToastOptions) => void;
    info: (message: string, options?: ToastOptions) => void;
    warning: (message: string, options?: ToastOptions) => void;
    loading: (message: string, options?: ToastOptions) => void;
    custom: (jsx: React.ReactNode, options?: ToastOptions) => void;
  }

  export const toast: Toast;
  export const Toaster: React.FC<any>;
} 