import { qrPng } from "@/lib/card";

export const dynamic = "force-dynamic";

/** QR image for a participant card. The unguessable token is the only credential. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48}$/.test(token)) return new Response("Not found", { status: 404 });
  const png = await qrPng(token);
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=3600" } });
}
