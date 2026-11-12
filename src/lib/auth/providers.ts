export type AuthProviderConfig = {
  /** This app's local provider id; also the callback path segment. */
  providerId: string;
  /** Upstream hint the broker forwards to. */
  idp: string;
  /** Human label for the sign-in button. */
  label: string;
};

export const AUTH_PROVIDERS: readonly AuthProviderConfig[] = [
  { providerId: "google", idp: "google", label: "Google" },
  { providerId: "x", idp: "twitter", label: "X" },
];
