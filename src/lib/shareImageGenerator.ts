import { BackgroundOption } from "@/components/highlights/BackgroundSelector";
import { UserStats } from "@/hooks/useUserAchievements";

interface ShareImageOptions {
  type: string;
  icon: string;
  value: string;
  label: string;
  sublabel?: string;
  background: BackgroundOption;
  customBackgroundUrl?: string | null;
  format: "story" | "square";
  stats?: UserStats;
}

// Dimensions
const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const SQUARE_SIZE = 1080;

export const generateShareImage = async (options: ShareImageOptions): Promise<HTMLCanvasElement> => {
  const { format, background, customBackgroundUrl, stats } = options;
  
  const width = format === "story" ? STORY_WIDTH : SQUARE_SIZE;
  const height = format === "story" ? STORY_HEIGHT : SQUARE_SIZE;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Draw background
  await drawBackground(ctx, width, height, background, customBackgroundUrl);

  // Draw dark overlay for readability
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, width, height);

  // Draw Rise Logo (top left)
  await drawLogo(ctx);

  // Draw Strava-style stacked stats
  if (stats) {
    drawStravaStyleStats(ctx, width, height, options, stats);
  } else {
    drawSingleStat(ctx, width, height, options);
  }

  // Draw Instagram handle (bottom right)
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
      ctx.fillStyle = "#1f2937"; // gray-800
      break;
    case "dark":
    default:
      ctx.fillStyle = "#0f0f0f"; // near black
      break;
  }
  ctx.fillRect(0, 0, width, height);
}

async function drawLogo(ctx: CanvasRenderingContext2D): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const logoHeight = 50;
      const logoWidth = (img.width / img.height) * logoHeight;
      ctx.globalAlpha = 0.95;
      ctx.drawImage(img, 60, 60, logoWidth, logoHeight);
      ctx.globalAlpha = 1;
      resolve();
    };
    img.onerror = () => {
      // If logo fails to load, draw text fallback
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.font = "bold 32px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("RISE", 60, 95);
      resolve();
    };
    img.src = "/logos/rise_dark.png";
  });
}

// Strava-style: vertical stacked stats with small labels above large values
function drawStravaStyleStats(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: ShareImageOptions,
  stats: UserStats
): void {
  const isStory = height > width;
  const startY = isStory ? height * 0.28 : height * 0.25;
  const spacing = isStory ? height * 0.12 : height * 0.15;
  const leftMargin = 80;

  // Stats to display
  const statsToShow = [
    { label: "Kursbuchungen", value: stats.totalBookings.toString() },
    { label: "Open Gym", value: stats.totalTrainings.toString() },
    { label: "Trainings gesamt", value: stats.totalSessions.toString() },
  ];

  if (stats.currentStreak > 0) {
    statsToShow.push({ label: "Wochen Streak", value: `${stats.currentStreak}w` });
  }

  statsToShow.forEach((stat, index) => {
    const y = startY + (index * spacing);
    
    // Small label above
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = `400 ${width * 0.028}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(stat.label.toUpperCase(), leftMargin, y);
    
    // Large value below
    ctx.fillStyle = "white";
    ctx.font = `700 ${width * 0.09}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(stat.value, leftMargin, y + (width * 0.09));
  });

  // Draw flame icon at the bottom (if streak)
  if (stats.currentStreak > 0) {
    drawFlameIcon(ctx, width, height, isStory);
  }
}

// Single stat view (for achievement cards)
function drawSingleStat(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: ShareImageOptions
): void {
  const isStory = height > width;
  const centerX = width / 2;
  const centerY = height * (isStory ? 0.42 : 0.45);

  // Draw icon
  if (options.type === "streak") {
    drawFlameIconCentered(ctx, centerX, centerY - height * 0.12, width * 0.12);
  } else if (options.type === "training" || options.type === "total") {
    drawDumbbellIcon(ctx, centerX, centerY - height * 0.12, width * 0.12);
  }

  // Value (large number)
  ctx.fillStyle = "white";
  ctx.font = `700 ${width * 0.2}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(options.value, centerX, centerY + height * 0.02);

  // Label below value
  ctx.font = `500 ${width * 0.04}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.fillText(options.label, centerX, centerY + height * 0.1);

  // Sublabel
  if (options.sublabel) {
    ctx.font = `400 ${width * 0.028}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.fillText(options.sublabel, centerX, centerY + height * 0.15);
  }
}

// Draw flame icon as SVG path
function drawFlameIcon(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  isStory: boolean
): void {
  const iconSize = width * 0.12;
  const x = 80;
  const y = isStory ? height * 0.75 : height * 0.7;
  
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(iconSize / 24, iconSize / 24);
  
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.beginPath();
  // Flame path from Lucide
  ctx.moveTo(12, 2);
  ctx.bezierCurveTo(12, 2, 12, 6.5, 12, 8);
  ctx.bezierCurveTo(12, 10, 11, 11.5, 10, 12);
  ctx.bezierCurveTo(9, 12.5, 8.5, 12.5, 8.5, 14.5);
  ctx.bezierCurveTo(8.5, 16.5, 10.5, 17, 11, 17);
  ctx.bezierCurveTo(11.5, 17, 13.5, 16.5, 14.5, 15);
  ctx.bezierCurveTo(15.5, 13.5, 16, 12, 16, 10);
  ctx.bezierCurveTo(16, 7, 14, 5, 12, 2);
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
}

function drawFlameIconCentered(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(size / 24, size / 24);
  
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.beginPath();
  // Simplified flame path
  ctx.moveTo(12, 2);
  ctx.bezierCurveTo(8, 6, 8, 8, 8.5, 10);
  ctx.bezierCurveTo(7, 11, 6, 12.5, 6, 15);
  ctx.bezierCurveTo(6, 19, 9, 22, 12, 22);
  ctx.bezierCurveTo(15, 22, 18, 19, 18, 15);
  ctx.bezierCurveTo(18, 12, 16, 10, 14, 8);
  ctx.bezierCurveTo(16, 10, 17, 11.5, 17, 13.5);
  ctx.bezierCurveTo(17, 16.5, 14.5, 18.5, 12, 18.5);
  ctx.bezierCurveTo(9.5, 18.5, 8, 16.5, 8, 14.5);
  ctx.bezierCurveTo(8, 12.5, 10, 11, 11, 10);
  ctx.bezierCurveTo(11, 8, 12, 4, 12, 2);
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
}

function drawDumbbellIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(size / 24, size / 24);
  
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  
  // Dumbbell shape
  ctx.beginPath();
  // Left weight
  ctx.moveTo(6.5, 6.5);
  ctx.lineTo(6.5, 17.5);
  // Right weight
  ctx.moveTo(17.5, 6.5);
  ctx.lineTo(17.5, 17.5);
  // Bar
  ctx.moveTo(6.5, 12);
  ctx.lineTo(17.5, 12);
  // Left caps
  ctx.moveTo(3, 8);
  ctx.lineTo(3, 16);
  ctx.moveTo(3, 8);
  ctx.lineTo(6.5, 8);
  ctx.moveTo(3, 16);
  ctx.lineTo(6.5, 16);
  // Right caps
  ctx.moveTo(21, 8);
  ctx.lineTo(21, 16);
  ctx.moveTo(21, 8);
  ctx.lineTo(17.5, 8);
  ctx.moveTo(21, 16);
  ctx.lineTo(17.5, 16);
  ctx.stroke();
  
  ctx.restore();
}

function drawHandle(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.font = `400 ${width * 0.022}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("@risefunctionalfitness", width - 60, height - 60);
}
