// Voice transcription (ElevenLabs) is disabled for now.
// Re-enable by uncommenting the handler below and the mic button in
// app/(app)/tasks/add-task-form.tsx.
export async function POST() {
  return Response.json({ error: "Voice transcription is disabled" }, { status: 503 });
}

/*
import { getUser } from "@/lib/auth";

const MAX_BYTES = 20 * 1024 * 1024;

// Receives a recorded audio blob and returns its transcript using ElevenLabs Speech-to-Text.
export async function POST(req: Request) {
  if (!(await getUser())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return Response.json({ error: "ELEVENLABS_API_KEY is not set" }, { status: 500 });

  const incoming = await req.formData();
  const audio = incoming.get("audio");
  if (!(audio instanceof File) || audio.size === 0)
    return Response.json({ error: "No audio received" }, { status: 400 });
  if (audio.size > MAX_BYTES) return Response.json({ error: "Recording too large" }, { status: 413 });

  const body = new FormData();
  body.append("model_id", "scribe_v1");
  body.append("tag_audio_events", "false");
  body.append("file", audio, audio.name || "recording.webm");

  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": key },
    body,
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200);
    return Response.json({ error: `Transcription failed (${res.status}) ${detail}` }, { status: 502 });
  }
  const data = (await res.json()) as { text?: string };
  return Response.json({ text: (data.text ?? "").trim() });
}
*/
