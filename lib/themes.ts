/**
 * Theme configuration constants.
 * CSS variable values for light and dark themes.
 */

export const THEME_COOKIES = {
  theme: "commit_voice_theme",
} as const;

export type Theme = "light" | "dark" | "system";

/**
 * Light theme CSS variable values.
 */
export const lightTheme = {
  background: "0 0% 100%",       // #ffffff
  foreground: "0 0% 4%",         // #0a0a0a
  card: "0 0% 96%",              // #f5f5f5
  "card-foreground": "0 0% 4%",
  primary: "221 83% 53%",        // #3b82f6
  "primary-foreground": "0 0% 100%",
  destructive: "0 84% 60%",      // #ef4444
  "destructive-foreground": "0 0% 100%",
  muted: "0 0% 90%",             // #e5e5e5
  "muted-foreground": "0 0% 40%",
  accent: "0 0% 90%",
  "accent-foreground": "0 0% 4%",
  border: "0 0% 88%",            // #e0e0e0
  input: "0 0% 88%",
  ring: "221 83% 53%",
} as const;

/**
 * Dark theme CSS variable values.
 */
export const darkTheme = {
  background: "0 0% 4%",         // #0a0a0a
  foreground: "0 0% 93%",        // #ededed
  card: "0 0% 9%",               // #161616
  "card-foreground": "0 0% 93%",
  primary: "221 83% 53%",        // #3b82f6
  "primary-foreground": "0 0% 100%",
  destructive: "0 84% 60%",      // #ef4444
  "destructive-foreground": "0 0% 100%",
  muted: "0 0% 14%",            // #262626
  "muted-foreground": "0 0% 53%",
  accent: "0 0% 14%",
  "accent-foreground": "0 0% 93%",
  border: "0 0% 20%",           // #333333
  input: "0 0% 20%",
  ring: "221 83% 53%",
} as const;

/**
 * Base values shared between themes.
 */
export const baseTheme = {
  radius: "0.5rem",
} as const;
