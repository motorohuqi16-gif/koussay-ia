/**
 * Image generation helper using internal ImageService
 *
 * Example usage:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "A serene landscape with mountains"
 *   });
 *
 * For editing:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "Add a rainbow to this landscape",
 *     originalImages: [{
 *       url: "https://example.com/original.jpg",
 *       mimeType: "image/jpeg"
 *     }]
 *   });
 */
import { storagePut } from "server/storage";
import { ENV } from "./env";

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
};

// Generate a simple SVG placeholder image
function generatePlaceholderSVG(prompt: string): string {
  const truncatedPrompt = prompt.substring(0, 50);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#1e40af;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="512" height="512" fill="url(#grad)"/>
    <circle cx="256" cy="200" r="80" fill="#60a5fa" opacity="0.8"/>
    <path d="M 100 400 Q 256 300 412 400 L 412 512 L 100 512 Z" fill="#93c5fd" opacity="0.7"/>
    <text x="256" y="480" font-family="Arial, sans-serif" font-size="16" fill="white" text-anchor="middle" font-weight="bold">
      Generated Image
    </text>
    <text x="256" y="50" font-family="Arial, sans-serif" font-size="14" fill="white" text-anchor="middle">
      ${truncatedPrompt}
    </text>
  </svg>`;
  
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  // Check if API is configured
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    console.warn('[Image Generation] Forge API not configured, using SVG placeholder');
    // Return a data URL with SVG placeholder when API is not available
    const placeholderUrl = generatePlaceholderSVG(options.prompt);
    return { url: placeholderUrl };
  }

  try {
    // Build the full URL by appending the service path to the base URL
    const baseUrl = ENV.forgeApiUrl.endsWith("/")
      ? ENV.forgeApiUrl
      : `${ENV.forgeApiUrl}/`;
    const fullUrl = new URL(
      "images.v1.ImageService/GenerateImage",
      baseUrl
    ).toString();

    console.log('[Image Generation] Calling API:', fullUrl);

    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "connect-protocol-version": "1",
        authorization: `Bearer ${ENV.forgeApiKey}`,
      },
      body: JSON.stringify({
        prompt: options.prompt,
        original_images: options.originalImages || [],
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(`[Image Generation] API Error: ${response.status} ${response.statusText}`, detail);
      throw new Error(
        `Image generation request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
    }

    const result = (await response.json()) as {
      image: {
        b64Json: string;
        mimeType: string;
      };
    };
    const base64Data = result.image.b64Json;
    const buffer = Buffer.from(base64Data, "base64");

    // Save to S3
    const { url } = await storagePut(
      `generated/${Date.now()}.png`,
      buffer,
      result.image.mimeType
    );
    console.log('[Image Generation] Success:', url);
    return {
      url,
    };
  } catch (error) {
    console.error('[Image Generation] Error:', error);
    // Fallback to SVG placeholder on error
    const placeholderUrl = generatePlaceholderSVG(options.prompt);
    return { url: placeholderUrl };
  }
}
