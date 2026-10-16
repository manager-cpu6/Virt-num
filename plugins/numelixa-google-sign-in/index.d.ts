export interface NumelixaGoogleSignInPlugin {
  signIn(options: { serverClientId: string }): Promise<{ idToken: string; displayName?: string; profilePictureUri?: string }>;
}
export declare const NumelixaGoogleSignIn: NumelixaGoogleSignInPlugin;
