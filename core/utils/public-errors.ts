export function getGroqPublicError(status: number, responseBody = ""): string {
  const lowerBody = responseBody.toLowerCase();

  if (status === 401 || lowerBody.includes("invalid_api_key")) {
    return "Groq API key is invalid or expired. Update GROQ_API_KEY in .env with a valid Groq key and restart DevAssist.";
  }

  if (status === 403) {
    return "Groq rejected this request. Check that GROQ_API_KEY is active and has permission to use the configured model.";
  }

  if (status === 429) {
    return "Groq rate limit reached. Wait a moment, then run the action again.";
  }

  if (status >= 500) {
    return "Groq is temporarily unavailable. Please retry the action in a few moments.";
  }

  if (status === 400) {
    return "Groq rejected the generated request. Try again with a smaller repository or shorter input.";
  }

  return `Groq request failed with status ${status}. Please verify GROQ_API_KEY and try again.`;
}

export function toPublicErrorMessage(error: unknown, fallback = "The operation failed. Please try again."): string {
  const rawMessage = error instanceof Error ? error.message : String(error || "");
  const lowerMessage = rawMessage.toLowerCase();

  if (!rawMessage) {
    return fallback;
  }

  if (lowerMessage.includes("invalid_api_key") || (lowerMessage.includes("groq") && lowerMessage.includes("401"))) {
    return getGroqPublicError(401, rawMessage);
  }

  if (lowerMessage.includes("rate limit") || lowerMessage.includes("429")) {
    return getGroqPublicError(429, rawMessage);
  }

  if (lowerMessage.includes("groq") && (lowerMessage.includes("500") || lowerMessage.includes("502") || lowerMessage.includes("503") || lowerMessage.includes("504"))) {
    return getGroqPublicError(500, rawMessage);
  }

  if (rawMessage.includes("{") && rawMessage.includes("}")) {
    return fallback;
  }

  return rawMessage.length > 240 ? `${rawMessage.slice(0, 237)}...` : rawMessage;
}
