export interface ThemeColors {
  BG_COLOR: string;
  BG_COLOR_2: string;
  BG_COLOR_MODAL: string;
  BORDER_COLOR: string;
  ACCENT_COLOR: string;
  FONT_COLOR_1: string;
  FONT_COLOR_2: string;
  FIELD_COLOR: string;
  FIELD_COLOR_DISABLED: string;
  FIELD_COLOR_HOVER: string;
  BLUE: string;
  GREEN: string;
  RED: string;
  YELLOW: string;
  HYPERLINK_COLOR: string;
  TEXT_DISABLED: string;
}

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  lockedAccent?: boolean;
  lockedHeader?: boolean;
}

export const themes: Record<string, Theme> = {
  light: {
    id: 'light',
    name: 'Light',
    colors: {
      BG_COLOR: '#FFFFFF',
      BG_COLOR_2: '#F9FAFB', // gray-50
      BG_COLOR_MODAL: '#FFFFFF',
      BORDER_COLOR: '#E5E7EB', // gray-200
      ACCENT_COLOR: '#007AFF',
      FONT_COLOR_1: '#111827', // gray-900
      FONT_COLOR_2: '#4B5563', // gray-600
      FIELD_COLOR: '#FFFFFF',
      FIELD_COLOR_DISABLED: '#F3F4F6', // gray-100
      FIELD_COLOR_HOVER: '#F9FAFB', // gray-50
      BLUE: '#3B82F6', // blue-500
      GREEN: '#22C55E', // green-500
      RED: '#EF4444', // red-500
      YELLOW: '#EAB308', // yellow-500
      HYPERLINK_COLOR: '#2563EB', // blue-600
      TEXT_DISABLED: '#9CA3AF', // gray-400
    },
  },
  dark: {
    id: 'dark',
    name: 'Dark',
    colors: {
      BG_COLOR: '#000000',
      BG_COLOR_2: '#09090b', // zinc-950
      BG_COLOR_MODAL: '#050505', // zinc-950
      BORDER_COLOR: '#27272A', // zinc-800
      ACCENT_COLOR: '#007AFF',
      FONT_COLOR_1: '#F3F4F6', // gray-100
      FONT_COLOR_2: '#9CA3AF', // gray-400
      FIELD_COLOR: '#09090b',
      FIELD_COLOR_DISABLED: '#030303', // zinc-950
      FIELD_COLOR_HOVER: '#18181b', // zinc-900
      BLUE: '#3B82F6',
      GREEN: '#22C55E',
      RED: '#EF4444',
      YELLOW: '#EAB308',
      HYPERLINK_COLOR: '#60A5FA', // blue-400
      TEXT_DISABLED: '#4B5563', // gray-600
    },
  },
highContrast: {
  id: 'highContrast',
  name: 'High Contrast',
  lockedAccent: true,
  lockedHeader: false, // Changed to false as requested
  colors: {
    // Backgrounds
    BG_COLOR: '#000000',
    BG_COLOR_2: '#000000',
    BG_COLOR_MODAL: '#000000',

    // Borders & separators
    BORDER_COLOR: '#FFFFFF',

    // Text
    FONT_COLOR_1: '#FFFFFF',   // primary text
    FONT_COLOR_2: '#FFFF00',   // secondary / emphasis text
    TEXT_DISABLED: '#7F7F7F',  // still readable on black

    // Accents & interaction
    ACCENT_COLOR: '#00FFFF',   // yellow (primary HC accent)
    HYPERLINK_COLOR: '#00FFFF',// aqua (Windows HC classic)

    // Form fields
    FIELD_COLOR: '#000000',
    FIELD_COLOR_HOVER: '#1A1A1A',
    FIELD_COLOR_DISABLED: '#000000',

    // Semantic colors (do not overuse)
    BLUE: '#00FFFF',
    GREEN: '#00FF00',
    RED: '#FF0000',
    YELLOW: '#FFFF00',
  },
},
  development: {
    id: 'development',
    name: 'Development',
    colors: {
      BG_COLOR: '#FF00FF', // Magenta
      BG_COLOR_2: '#00FFFF', // Cyan
      BG_COLOR_MODAL: '#FFFF00', // Yellow
      BORDER_COLOR: '#006fff', // Lime
      ACCENT_COLOR: '#ff0000', // Red
      FONT_COLOR_1: '#11ff00', // Navy
      FONT_COLOR_2: '#800080', // Purple
      FIELD_COLOR: '#FFA500', // Orange
      FIELD_COLOR_DISABLED: '#808080', // Gray (explicitly requested no gray, but for disabled maybe ok? User said "no gray or white". Let's use Brown)
      FIELD_COLOR_HOVER: '#FFC0CB', // Pink
      BLUE: '#FFFF00',
      GREEN: '#1E90FF',
      RED: '#00ffc4',
      YELLOW: '#FF0000',
      HYPERLINK_COLOR: '#0000FF',
      TEXT_DISABLED: '#800000', // Maroon
    },
  },
};

// Override Development colors to strictly follow "no gray or white, no blue accent" and "highly saturated"
themes.development.colors = {
  BG_COLOR: '#FF00FF', // Magenta
  BG_COLOR_2: '#00FFFF', // Cyan
  BG_COLOR_MODAL: '#FFFF00', // Yellow
  BORDER_COLOR: '#006fff', // Lime
  ACCENT_COLOR: '#ff0000', // OrangeRed (No Blue Accent)
  FONT_COLOR_1: '#000000', // Black (for contrast on vibrant backgrounds)
  FONT_COLOR_2: '#11ff00', // Navy
  FIELD_COLOR: '#FFA500', // Orange
  FIELD_COLOR_DISABLED: '#8B4513', // SaddleBrown
  FIELD_COLOR_HOVER: '#FF1493', // DeepPink
  BLUE: '#FFFF00', // DodgerBlue
  GREEN: '#1E90FF', // LimeGreen
  RED: '#00ffc4', // Red
  YELLOW: '#FF0000', // Gold
  HYPERLINK_COLOR: '#4B0082', // Indigo
  TEXT_DISABLED: '#800000', // Maroon
};
