import { BackgroundOption } from "@/components/highlights/BackgroundSelector";

interface ShareImageOptions {
  type: string;
  icon: string;
  value: string;
  label: string;
  sublabel?: string;
  background: BackgroundOption;
  customBackgroundUrl?: string | null;
  format: "story" | "square";
}

// Dimensions
const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const SQUARE_SIZE = 1080;

export const generateShareImage = async (options: ShareImageOptions): Promise<HTMLCanvasElement> => {
  const { format, background, customBackgroundUrl } = options;
  
  const width = format === "story" ? STORY_WIDTH : SQUARE_SIZE;
  const height = format === "story" ? STORY_HEIGHT : SQUARE_SIZE;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Draw background
  await drawBackground(ctx, width, height, background, customBackgroundUrl);

  // Draw dark overlay for readability
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fillRect(0, 0, width, height);

  // Draw Rise Logo
  await drawLogo(ctx, width);

  // Draw main content
  drawContent(ctx, width, height, options);

  // Draw Instagram handle
  drawHandle(ctx, width, height);

  return canvas;
};

async function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  background: BackgroundOption,
  customUrl?: string | null
): Promise<void> {
  if (background === "custom" && customUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // Cover the canvas while maintaining aspect ratio
        const imgRatio = img.width / img.height;
        const canvasRatio = width / height;
        
        let drawWidth, drawHeight, offsetX, offsetY;
        
        if (imgRatio > canvasRatio) {
          drawHeight = height;
          drawWidth = height * imgRatio;
          offsetX = (width - drawWidth) / 2;
          offsetY = 0;
        } else {
          drawWidth = width;
          drawHeight = width / imgRatio;
          offsetX = 0;
          offsetY = (height - drawHeight) / 2;
        }
        
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        resolve();
      };
      img.onerror = reject;
      img.src = customUrl;
    });
  }

  // Preset backgrounds
  switch (background) {
    case "gradient":
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#7f1d1d"); // red-900
      gradient.addColorStop(1, "#111827"); // gray-900
      ctx.fillStyle = gradient;
      break;
    case "gym":
      ctx.fillStyle = "#374151"; // gray-700
      break;
    case "dark":
    default:
      ctx.fillStyle = "#111827"; // gray-900
      break;
  }
  ctx.fillRect(0, 0, width, height);
}

async function drawLogo(ctx: CanvasRenderingContext2D, width: number): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const logoHeight = 60;
      const logoWidth = (img.width / img.height) * logoHeight;
      ctx.globalAlpha = 0.9;
      ctx.drawImage(img, 50, 50, logoWidth, logoHeight);
      ctx.globalAlpha = 1;
      resolve();
    };
    img.onerror = () => {
      // If logo fails to load, draw text fallback
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.font = "bold 36px system-ui, sans-serif";
      ctx.fillText("RISE", 50, 90);
      resolve();
    };
    img.src = "/logos/rise_dark.png";
  });
}

function drawContent(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: ShareImageOptions
): void {
  const centerX = width / 2;
  const centerY = height / 2;

  // Icon (emoji)
  ctx.font = `${width * 0.15}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(options.icon, centerX, centerY - height * 0.1);

  // Value (large number)
  ctx.fillStyle = "white";
  ctx.font = `bold ${width * 0.18}px system-ui, sans-serif`;
  ctx.fillText(options.value, centerX, centerY + height * 0.05);

  // Label
  ctx.font = `600 ${width * 0.045}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fillText(options.label, centerX, centerY + height * 0.13);

  // Sublabel
  if (options.sublabel) {
    ctx.font = `${width * 0.03}px system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.fillText(options.sublabel, centerX, centerY + height * 0.18);
  }
}

function drawHandle(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.font = `${width * 0.025}px system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("@risefunctionalfitness", width - 50, height - 50);
}
