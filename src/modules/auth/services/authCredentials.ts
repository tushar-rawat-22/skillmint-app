type AuthCredentialClient = {
  auth: {
    signInWithPassword(input: {
      email: string;
      password: string;
    }): PromiseLike<{ error: unknown }>;
    signUp(input: {
      email: string;
      password: string;
      options?: {
        emailRedirectTo?: string;
      };
    }): PromiseLike<{
      data: { session: unknown | null };
      error: unknown;
    }>;
  };
};

export type AuthCredentialRequest =
  | {
      mode: "login";
      email: string;
      password: string;
    }
  | {
      mode: "signup";
      email: string;
      password: string;
      publicSignupEnabled: boolean;
      emailRedirectTo: string | null;
    };

export type AuthCredentialResult =
  | { status: "success"; sessionCreated: boolean }
  | { status: "failure" }
  | { status: "signup_disabled" };

export async function submitAuthCredentials(
  client: AuthCredentialClient,
  request: AuthCredentialRequest,
): Promise<AuthCredentialResult> {
  if (
    request.mode === "signup" &&
    request.publicSignupEnabled !== true
  ) {
    return { status: "signup_disabled" };
  }

  try {
    if (request.mode === "login") {
      const { error } = await client.auth.signInWithPassword({
        email: request.email.trim(),
        password: request.password,
      });

      return error
        ? { status: "failure" }
        : { status: "success", sessionCreated: true };
    }

    const { data, error } = await client.auth.signUp({
      email: request.email.trim(),
      password: request.password,
      ...(request.emailRedirectTo
        ? {
            options: {
              emailRedirectTo: request.emailRedirectTo,
            },
          }
        : {}),
    });

    return error
      ? { status: "failure" }
      : {
          status: "success",
          sessionCreated: Boolean(data.session),
        };
  } catch {
    return { status: "failure" };
  }
}
