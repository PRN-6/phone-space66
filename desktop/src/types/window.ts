import { ReactNode } from 'react';

export type WindowId =
  | 'dashboard'
  | 'file-manager'
  | 'screen-mirror'
  | 'launcher'
  | 'gallery'
  | 'settings'
  | 'pairing-dialog';

export interface WindowInstance {
  id: WindowId;
  title: string;
  icon: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  prevPosition?: { x: number; y: number; width: number; height: number };
}

