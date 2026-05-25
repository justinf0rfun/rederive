export type TurnstileVerificationResult =
  | { ok: true; bypassed: boolean }
  | { ok: false; error: string };

type TurnstileResponse = {
  success: boolean;
  "error-codes"?: string[];
};

export async function verifyTurnstileToken(
  token: string,
  env: Env & { TURNSTILE_SECRET_KEY?: string },
  remoteIp: string | null
): Promise<TurnstileVerificationResult> {
  if (String(env.APP_ENV) !== "production") {
    return { ok: true, bypassed: true };
  }

  if (!token) {
    return { ok: false, error: "Turnstile token is missing." };
  }

  const secretKey = env.TURNSTILE_SECRET_KEY || "";
  if (!secretKey) {
    return { ok: false, error: "Turnstile secret is not configured." };
  }

  const formData = new FormData();
  formData.set("secret", secretKey);
  formData.set("response", token);
  if (remoteIp) {
    formData.set("remoteip", remoteIp);
  }

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: formData,
    }
  );
  const result = (await response.json()) as TurnstileResponse;

  if (!result.success) {
    return {
      ok: false,
      error: result["error-codes"]?.join(", ") || "Turnstile verification failed.",
    };
  }

  return { ok: true, bypassed: false };
}
