export type ProviderErrorKind =
  | "billing_limit"
  | "auth"
  | "rate_limit"
  | "quota"
  | "bad_request"
  | "content_policy"
  | "network"
  | "unknown";

export interface NormalizedProviderError {
  kind: ProviderErrorKind;
  title: string;
  designerMessage: string;
  technicalMessage: string;
  retryable: boolean;
  suggestedAction: string;
}

export function normalizeProviderError(error: unknown): NormalizedProviderError {
  const technicalMessage = error instanceof Error ? error.message : String(error);
  const raw = technicalMessage.toLowerCase();

  if (raw.includes("billing hard limit") || raw.includes("billing_hard_limit_reached")) {
    return {
      kind: "billing_limit",
      title: "OpenAI billing limit reached",
      designerMessage: "The app reached the OpenAI billing limit. Add credits or increase the project spend limit, then retry.",
      technicalMessage,
      retryable: false,
      suggestedAction: "Ask the app owner to add credits or increase OpenAI usage limits."
    };
  }

  if (raw.includes("openai api key is missing") || raw.includes("invalid api key") || raw.includes("incorrect api key") || raw.includes("authentication")) {
    return {
      kind: "auth",
      title: "OpenAI API key problem",
      designerMessage: "OpenAI API key is missing. Add OPENAI_API_KEY to the server .env file, or use Demo Mode.",
      technicalMessage,
      retryable: false,
      suggestedAction: "Add OPENAI_API_KEY to server env, or switch to Demo Mode (mock)."
    };
  }

  if (raw.includes("rate limit") || raw.includes("too many requests")) {
    return {
      kind: "rate_limit",
      title: "OpenAI rate limit reached",
      designerMessage: "Too many requests were sent too quickly. The worker can retry later.",
      technicalMessage,
      retryable: true,
      suggestedAction: "Wait and retry, or lower request burst size."
    };
  }

  if (raw.includes("insufficient_quota") || raw.includes("insufficient quota") || raw.includes("quota")) {
    return {
      kind: "quota",
      title: "OpenAI quota or credits issue",
      designerMessage: "The account may need credits, billing setup, or a higher usage limit.",
      technicalMessage,
      retryable: false,
      suggestedAction: "Check billing setup, credits, and usage tier."
    };
  }

  if (raw.includes("content policy") || raw.includes("safety")) {
    return {
      kind: "content_policy",
      title: "Request blocked by content policy",
      designerMessage: "This prompt may violate provider content policy. Try a safer prompt wording.",
      technicalMessage,
      retryable: false,
      suggestedAction: "Edit prompt content and retry."
    };
  }

  if (raw.includes("network") || raw.includes("fetch failed") || raw.includes("econn")) {
    return {
      kind: "network",
      title: "Network issue while generating",
      designerMessage: "The provider could not be reached. Please retry in a moment.",
      technicalMessage,
      retryable: true,
      suggestedAction: "Check internet connectivity and provider availability."
    };
  }

  if (raw.includes("400") || raw.includes("bad request") || raw.includes("invalid")) {
    return {
      kind: "bad_request",
      title: "Image generation request rejected",
      designerMessage: "The provider rejected this request. Check the technical details or try a smaller prompt.",
      technicalMessage,
      retryable: false,
      suggestedAction: "Review model, params, and prompt length/content."
    };
  }

  return {
    kind: "unknown",
    title: "Image generation failed",
    designerMessage: "The provider rejected this request. Check the technical details or try a smaller prompt.",
    technicalMessage,
    retryable: false,
    suggestedAction: "Review logs and retry with adjusted prompt/params."
  };
}
