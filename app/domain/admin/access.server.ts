import { redirect } from "react-router";

export type AdminIdentity = {
  email: string;
  source: "local-mock" | "cloudflare-access";
};

type AdminEnv = Env & {
  LOCAL_ADMIN_EMAIL?: string;
  ALLOWED_ADMIN_EMAILS?: string;
};

export function requireAdminIdentity(
  request: Request,
  env: AdminEnv
): AdminIdentity {
  if (String(env.APP_ENV) !== "production") {
    return {
      email: env.LOCAL_ADMIN_EMAIL || "local-admin@rederive.dev",
      source: "local-mock",
    };
  }

  const email = request.headers.get("Cf-Access-Authenticated-User-Email");
  if (!email) {
    const url = new URL(request.url);
    if (url.pathname === "/admin") {
      throw redirect("/admin/");
    }

    throw new Response("Cloudflare Access identity is required.", {
      status: 401,
    });
  }

  const allowedEmails = parseAllowedEmails(env.ALLOWED_ADMIN_EMAILS);
  if (allowedEmails.length > 0 && !allowedEmails.includes(email.toLowerCase())) {
    throw new Response("Forbidden", { status: 403 });
  }

  return { email, source: "cloudflare-access" };
}

function parseAllowedEmails(value?: string): string[] {
  return (value || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}
