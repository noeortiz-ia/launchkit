import { convexAuth } from "@convex-dev/auth/server";
import Resend from "@auth/core/providers/resend";

const ResendProvider = {
  id: "resend",
  type: "email" as const,
  name: "Resend",
  from: "onboarding@resend.dev",
  async sendVerificationRequest({ identifier: to, url, provider }: any) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AUTH_RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: provider.from || "onboarding@resend.dev",
        to,
        subject: `Inicia sesión en LaunchKit`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
            <h1 style="font-size: 24px;">Bienvenido a LaunchKit</h1>
            <p style="font-size: 16px;">Haz click en el botón de abajo para acceder a tu cuenta.</p>
            <a href="${url}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin: 20px 0;">Iniciar Sesión</a>
            <p style="color: #666; font-size: 14px;">Si no solicitaste este correo, puedes ignorarlo.</p>
          </div>
        `,
        text: `Inicia sesión en LaunchKit: ${url}`,
      }),
    });
    if (!res.ok) throw new Error("Resend failed: " + (await res.text()));
  },
};

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [ResendProvider],
});
