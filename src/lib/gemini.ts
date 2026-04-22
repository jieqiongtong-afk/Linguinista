export async function extractCueCard(base64Image: string, mimeType: string = "image/png") {
  const response = await fetch("/api/extract-cue-card", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64Image, mimeType }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || `Server Error (${response.status})`);
  }
  return response.json();
}

export async function evaluateAudioFile(base64Audio: string, mimeType: string = "audio/mpeg") {
  const response = await fetch("/api/evaluate-audio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio: base64Audio, mimeType }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Failed to evaluate audio");
  }
  return response.json();
}
