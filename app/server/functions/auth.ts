import { createServerFn } from "@tanstack/react-start";
import { sealData, unsealData } from "iron-session";
import {
  getRequestHeader,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";

const SESSION_OPTIONS = {
  password: process.env.SESSION_SECRET!,
  ttl: 60 * 60 * 24,
};

const COOKIE_NAME = "renux_session";

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.split("=");
    if (name) {
      cookies[name.trim()] = decodeURIComponent(rest.join("="));
    }
  });
  return cookies;
}

export const login = createServerFn({ method: "POST" })
  .inputValidator((data: { pin: string }) => data)
  .handler(async ({ data }) => {
    if (data.pin !== process.env.ACCESS_PIN) {
      throw new Error("PIN incorrecto");
    }

    const sealed = await sealData({ autenticado: true }, SESSION_OPTIONS);

    setResponseHeader(
      "Set-Cookie",
      `${COOKIE_NAME}=${sealed}; HttpOnly; Secure=${process.env.NODE_ENV === "production"}; SameSite=Lax; Max-Age=${60 * 60 * 24}; Path=/`
    );

    return { ok: true };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  setResponseHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; Secure=${process.env.NODE_ENV === "production"}; SameSite=Lax; Max-Age=0; Path=/`
  );
  return { ok: true };
});

export const checkSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const cookieHeader = getRequestHeader("cookie");
    const cookies = parseCookies(cookieHeader);
    const cookie = cookies[COOKIE_NAME];

    if (!cookie) return { autenticado: false };

    try {
      const data = await unsealData<{ autenticado: boolean }>(
        cookie,
        SESSION_OPTIONS
      );
      return { autenticado: data.autenticado === true };
    } catch {
      return { autenticado: false };
    }
  }
);

export const requireAuth = createServerFn({ method: "GET" }).handler(
  async () => {
    const cookieHeader = getRequestHeader("cookie");
    const cookies = parseCookies(cookieHeader);
    const cookie = cookies[COOKIE_NAME];

    if (!cookie) {
      throw redirect({ to: "/login" });
    }

    try {
      const data = await unsealData<{ autenticado: boolean }>(
        cookie,
        SESSION_OPTIONS
      );
      if (data.autenticado !== true) {
        throw redirect({ to: "/login" });
      }
    } catch (e) {
      if (e && typeof e === "object" && "status" in e && (e as { status: number }).status === 302) throw e;
      throw redirect({ to: "/login" });
    }

    return { autenticado: true };
  }
);
