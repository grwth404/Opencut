/// <reference types="react" />
/// <reference types="react-dom" />

// Global React types
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

// React module declarations
declare module 'react' {
  export * from '@types/react';
}

// Ensure this file is treated as a module
export {}; 