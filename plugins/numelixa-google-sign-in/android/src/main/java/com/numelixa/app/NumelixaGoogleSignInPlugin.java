package com.numelixa.app;

import androidx.core.content.ContextCompat;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.NoCredentialException;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetGoogleIdOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import java.util.concurrent.Executor;

@CapacitorPlugin(name = "NumelixaGoogleSignIn")
public class NumelixaGoogleSignInPlugin extends Plugin {
    @PluginMethod
    public void signIn(PluginCall call) {
        String serverClientId = call.getString("serverClientId", "").trim();
        if (serverClientId.isEmpty()) {
            call.reject("Google sign-in is not configured (missing server client ID).");
            return;
        }
        try {
            GetGoogleIdOption googleOption = new GetGoogleIdOption.Builder()
                .setServerClientId(serverClientId)
                .setFilterByAuthorizedAccounts(false)
                .setAutoSelectEnabled(false)
                .build();
            GetCredentialRequest request = new GetCredentialRequest.Builder()
                .addCredentialOption(googleOption)
                .build();
            CredentialManager manager = CredentialManager.create(getContext());
            Executor executor = ContextCompat.getMainExecutor(getContext());
            manager.getCredentialAsync(
                getActivity(), request, null, executor,
                new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                    @Override
                    public void onResult(GetCredentialResponse response) {
                        try {
                            Credential credential = response.getCredential();
                            if (!(credential instanceof CustomCredential) ||
                                !GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())) {
                                call.reject("Google returned an unsupported credential type.");
                                return;
                            }
                            GoogleIdTokenCredential googleCredential = GoogleIdTokenCredential.createFrom(
                                ((CustomCredential) credential).getData());
                            String idToken = googleCredential.getIdToken();
                            if (idToken == null || idToken.trim().isEmpty()) {
                                call.reject("Google did not return an ID token.");
                                return;
                            }
                            JSObject result = new JSObject();
                            result.put("idToken", idToken);
                            result.put("displayName", googleCredential.getDisplayName());
                            result.put("profilePictureUri", googleCredential.getProfilePictureUri() == null
                                ? "" : googleCredential.getProfilePictureUri().toString());
                            call.resolve(result);
                        } catch (Exception error) {
                            call.reject("Unable to read the Google credential: " + safe(error));
                        }
                    }
                    @Override
                    public void onError(GetCredentialException error) {
                        if (error instanceof GetCredentialCancellationException) {
                            call.reject("CANCELED: Google sign-in was cancelled.");
                        } else if (error instanceof NoCredentialException) {
                            call.reject("NO_CREDENTIAL: No Google account is available on this device.");
                        } else {
                            call.reject("Google Credential Manager failed: " + safe(error));
                        }
                    }
                }
            );
        } catch (Exception error) {
            call.reject("Unable to start native Google sign-in: " + safe(error));
        }
    }
    private static String safe(Throwable error) {
        if (error == null) return "Unknown error";
        String message = error.getMessage();
        return message == null || message.trim().isEmpty()
            ? error.getClass().getSimpleName() : message;
    }
}