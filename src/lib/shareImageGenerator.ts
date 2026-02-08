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

  // Draw decorative elements
  drawDecorativeElements(ctx, width, height);

  // Draw Rise Logo (top center)
  await drawLogo(ctx, width);

  // Draw main content based on type
  drawMainContent(ctx, width, height, options, stats);

  // Draw Instagram handle (bottom center, white)
  drawHandle(ctx, width, height);

  // Sparkle removed as per user request

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
        
        // Add dark overlay for readability
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, width, height);
        
        // Add red gradient from bottom
        drawBottomGradient(ctx, width, height);
        resolve();
      };
      img.onerror = reject;
      img.src = customUrl;
    });
  }

  // Default: Very dark background (almost black with slight red tint)
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, "#0d0a0c"); // Very dark
  bgGradient.addColorStop(0.5, "#150d10"); // Slightly lighter dark
  bgGradient.addColorStop(1, "#0a0608"); // Dark again
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add red gradient from bottom
  drawBottomGradient(ctx, width, height);
}

function drawBottomGradient(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const gradient = ctx.createLinearGradient(0, height, 0, height * 0.5);
  gradient.addColorStop(0, "rgba(139, 30, 30, 0.6)"); // Strong red at bottom
  gradient.addColorStop(0.3, "rgba(100, 20, 20, 0.3)"); // Medium red
  gradient.addColorStop(1, "rgba(50, 10, 10, 0)"); // Fade to transparent
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawDecorativeElements(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = "white";
  ctx.lineWidth = 3;

  // Large dumbbell top-right
  drawDumbbell(ctx, width * 0.82, height * 0.12, 120, Math.PI / 5);
  
  // Large dumbbell bottom-left
  drawDumbbell(ctx, width * 0.15, height * 0.78, 100, -Math.PI / 4);
  
  // Medium dumbbell right side
  drawDumbbell(ctx, width * 0.92, height * 0.55, 70, Math.PI / 2.5);
  
  // Small dumbbell left
  drawDumbbell(ctx, width * 0.08, height * 0.35, 50, -Math.PI / 6);
  
  // Medium dumbbell bottom-right
  drawDumbbell(ctx, width * 0.75, height * 0.85, 80, Math.PI / 3);

  // Concentric circles left side
  ctx.globalAlpha = 0.05;
  const circleCenter1 = { x: width * 0.12, y: height * 0.25 };
  [60, 45, 30].forEach(radius => {
    ctx.beginPath();
    ctx.arc(circleCenter1.x, circleCenter1.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Concentric circles right side
  const circleCenter2 = { x: width * 0.88, y: height * 0.42 };
  [50, 35, 20].forEach(radius => {
    ctx.beginPath();
    ctx.arc(circleCenter2.x, circleCenter2.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Single circles scattered
  ctx.globalAlpha = 0.04;
  [
    { x: width * 0.25, y: height * 0.18, r: 25 },
    { x: width * 0.7, y: height * 0.72, r: 35 },
    { x: width * 0.05, y: height * 0.6, r: 20 },
  ].forEach(({ x, y, r }) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Curved lines
  ctx.globalAlpha = 0.05;
  ctx.lineWidth = 2;
  
  // Top curved line
  ctx.beginPath();
  ctx.moveTo(width * 0.2, height * 0.08);
  ctx.quadraticCurveTo(width * 0.35, height * 0.15, width * 0.3, height * 0.22);
  ctx.stroke();

  // Right curved line
  ctx.beginPath();
  ctx.moveTo(width * 0.75, height * 0.18);
  ctx.quadraticCurveTo(width * 0.95, height * 0.25, width * 0.88, height * 0.38);
  ctx.stroke();

  // Left curved line
  ctx.beginPath();
  ctx.moveTo(width * 0.08, height * 0.48);
  ctx.quadraticCurveTo(width * 0.02, height * 0.58, width * 0.12, height * 0.68);
  ctx.stroke();

  // Bottom curved line
  ctx.beginPath();
  ctx.moveTo(width * 0.55, height * 0.88);
  ctx.quadraticCurveTo(width * 0.7, height * 0.92, width * 0.85, height * 0.85);
  ctx.stroke();

  ctx.globalAlpha = 1;
}

function drawDumbbell(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  
  // Bar
  ctx.beginPath();
  ctx.moveTo(-size/2, 0);
  ctx.lineTo(size/2, 0);
  ctx.stroke();
  
  // Left weight plates
  const plateWidth = size * 0.15;
  const plateHeight = size * 0.5;
  ctx.beginPath();
  ctx.roundRect(-size/2 - plateWidth, -plateHeight/2, plateWidth, plateHeight, 3);
  ctx.stroke();
  
  // Right weight plates
  ctx.beginPath();
  ctx.roundRect(size/2, -plateHeight/2, plateWidth, plateHeight, 3);
  ctx.stroke();
  
  ctx.restore();
}

async function drawLogo(ctx: CanvasRenderingContext2D, width: number): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const logoHeight = 100; // Larger logo
      const logoWidth = (img.width / img.height) * logoHeight;
      const x = (width - logoWidth) / 2;
      ctx.drawImage(img, x, 120, logoWidth, logoHeight); // Lower position
      resolve();
    };
    img.onerror = () => {
      // Fallback: Draw text - larger and lower
      ctx.fillStyle = "white";
      ctx.font = "bold 56px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("RISE", width / 2, 160);
      
      ctx.font = "300 24px system-ui, -apple-system, sans-serif";
      ctx.fillText("Functional Fitness", width / 2, 195);
      resolve();
    };
    img.src = "/logos/rise_dark.png";
  });
}

function drawMainContent(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: ShareImageOptions,
  stats?: UserStats | null
): void {
  const isStory = height > width;
  const centerX = width / 2;
  
  // Calculate vertical positions - adjusted for new layout
  const iconY = isStory ? height * 0.30 : height * 0.34;
  const labelY = isStory ? height * 0.44 : height * 0.50;
  const valueY = isStory ? height * 0.52 : height * 0.60;
  const chartY = isStory ? height * 0.66 : height * 0.74;

  // Draw main icon (large, centered) - bigger flame
  drawMainIcon(ctx, centerX, iconY, options.type, width * 0.22);

  // Draw label (red/primary color, bold) - e.g. "Streak"
  ctx.fillStyle = "#dc2626"; // red-600
  ctx.font = `700 ${width * 0.055}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(options.label, centerX, labelY);

  // Draw main value (much larger, white, bold) - e.g. "7 Wochen"
  ctx.fillStyle = "white";
  ctx.font = `700 ${width * 0.10}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(options.value, centerX, valueY);

  // Draw progress chart with arrow
  if (options.type === "streak" && stats) {
    drawStreakChart(ctx, centerX, chartY, width, stats.currentStreak, stats.longestStreak);
  } else if (options.type === "total" && stats) {
    drawTotalChart(ctx, centerX, chartY, width, stats.totalBookings, stats.totalTrainings);
  } else if (options.sublabel) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = `400 ${width * 0.028}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(options.sublabel, centerX, chartY);
  }
}

function drawMainIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: string,
  size: number
): void {
  ctx.save();
  
  if (type === "streak") {
    // Beautiful multi-layered flame like in reference image
    const scale = size / 120;
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    
    // Main outer flame (white)
    ctx.fillStyle = "white";
    ctx.beginPath();
    // Large flame shape with multiple peaks
    ctx.moveTo(0, 60);
    // Left side
    ctx.bezierCurveTo(-35, 45, -45, 10, -30, -35);
    ctx.bezierCurveTo(-25, -50, -15, -55, -8, -50);
    // Left peak dip
    ctx.bezierCurveTo(-5, -40, 0, -30, 0, -25);
    // Right peak
    ctx.bezierCurveTo(0, -30, 5, -40, 8, -50);
    ctx.bezierCurveTo(15, -55, 25, -50, 30, -35);
    // Right side
    ctx.bezierCurveTo(45, 10, 35, 45, 0, 60);
    ctx.closePath();
    ctx.fill();
    
    // Inner cutout (dark, creates depth)
    ctx.fillStyle = "rgba(20, 10, 12, 0.9)";
    ctx.beginPath();
    ctx.moveTo(0, 55);
    ctx.bezierCurveTo(-18, 40, -22, 15, -12, -5);
    ctx.bezierCurveTo(-8, -12, -3, -10, 0, -5);
    ctx.bezierCurveTo(3, -10, 8, -12, 12, -5);
    ctx.bezierCurveTo(22, 15, 18, 40, 0, 55);
    ctx.closePath();
    ctx.fill();
    
  } else if (type === "training" || type === "total") {
    // Dumbbell icon
    ctx.translate(x - size / 2, y - size / 2);
    ctx.scale(size / 24, size / 24);
    
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    
    ctx.beginPath();
    ctx.moveTo(6, 12);
    ctx.lineTo(18, 12);
    ctx.moveTo(4, 8);
    ctx.lineTo(4, 16);
    ctx.moveTo(7, 8);
    ctx.lineTo(7, 16);
    ctx.moveTo(4, 8);
    ctx.lineTo(7, 8);
    ctx.moveTo(4, 16);
    ctx.lineTo(7, 16);
    ctx.moveTo(17, 8);
    ctx.lineTo(17, 16);
    ctx.moveTo(20, 8);
    ctx.lineTo(20, 16);
    ctx.moveTo(17, 8);
    ctx.lineTo(20, 8);
    ctx.moveTo(17, 16);
    ctx.lineTo(20, 16);
    ctx.stroke();
  } else {
    // Trophy icon (default)
    ctx.translate(x - size / 2, y - size / 2);
    ctx.scale(size / 24, size / 24);
    
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.moveTo(6, 3);
    ctx.lineTo(18, 3);
    ctx.lineTo(18, 8);
    ctx.bezierCurveTo(18, 13, 15, 15, 12, 16);
    ctx.bezierCurveTo(9, 15, 6, 13, 6, 8);
    ctx.lineTo(6, 3);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(6, 5);
    ctx.bezierCurveTo(3, 5, 3, 9, 6, 9);
    ctx.moveTo(18, 5);
    ctx.bezierCurveTo(21, 5, 21, 9, 18, 9);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(12, 16);
    ctx.lineTo(12, 19);
    ctx.moveTo(8, 19);
    ctx.lineTo(16, 19);
    ctx.lineTo(16, 21);
    ctx.lineTo(8, 21);
    ctx.lineTo(8, 19);
    ctx.stroke();
  }
  
  ctx.restore();
}

function drawStreakChart(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  width: number,
  current: number,
  longest: number
): void {
  const chartWidth = width * 0.75;
  const chartHeight = width * 0.18;
  const startX = centerX - chartWidth / 2;
  const barCount = 10;
  const barWidth = (chartWidth / barCount) * 0.75;
  const barGap = (chartWidth / barCount) * 0.25;

  // Draw bars with gradient heights (ascending pattern)
  for (let i = 0; i < barCount; i++) {
    const progress = (i + 1) / barCount;
    const barHeight = chartHeight * (0.25 + progress * 0.75);
    const x = startX + i * (barWidth + barGap);
    const barY = y + chartHeight - barHeight;

    // Red gradient for each bar
    const gradient = ctx.createLinearGradient(x, barY + barHeight, x, barY);
    gradient.addColorStop(0, "#5c1515"); // darker red at bottom
    gradient.addColorStop(0.5, "#8b1e1e"); // medium red
    gradient.addColorStop(1, "#b91c1c"); // brighter red at top
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, barY, barWidth, barHeight, 4);
    ctx.fill();
  }

  // Draw trend line on top of bars with arrow
  ctx.strokeStyle = "white";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  
  for (let i = 0; i < barCount; i++) {
    const progress = (i + 1) / barCount;
    const barHeight = chartHeight * (0.25 + progress * 0.75);
    const x = startX + i * (barWidth + barGap) + barWidth / 2;
    const lineY = y + chartHeight - barHeight - 8;
    
    if (i === 0) {
      ctx.moveTo(x, lineY);
    } else {
      ctx.lineTo(x, lineY);
    }
  }
  
  // Extend line with upward arrow
  const lastBarX = startX + (barCount - 1) * (barWidth + barGap) + barWidth / 2;
  const lastBarHeight = chartHeight * (0.25 + 1 * 0.75);
  const lastLineY = y + chartHeight - lastBarHeight - 8;
  
  // Arrow pointing up-right
  const arrowEndX = lastBarX + 35;
  const arrowEndY = lastLineY - 25;
  ctx.lineTo(arrowEndX, arrowEndY);
  ctx.stroke();
  
  // Draw arrow head
  ctx.beginPath();
  ctx.moveTo(arrowEndX, arrowEndY);
  ctx.lineTo(arrowEndX - 12, arrowEndY + 5);
  ctx.lineTo(arrowEndX - 5, arrowEndY + 12);
  ctx.closePath();
  ctx.fillStyle = "white";
  ctx.fill();

  // Labels below chart - white text
  const labelY = y + chartHeight + 45;
  ctx.font = `400 ${width * 0.026}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.textAlign = "left";
  ctx.fillText(`Aktuell: ${current} Wochen`, startX, labelY);
  
  ctx.textAlign = "right";
  ctx.fillText(`Längste: ${longest} Wochen`, startX + chartWidth, labelY);
}

function drawTotalChart(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  width: number,
  bookings: number,
  trainings: number
): void {
  const total = bookings + trainings;
  const chartWidth = width * 0.6;
  const chartHeight = 24;
  const startX = centerX - chartWidth / 2;

  // Background bar
  ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
  ctx.beginPath();
  ctx.roundRect(startX, y, chartWidth, chartHeight, 12);
  ctx.fill();

  // Bookings portion
  const bookingsWidth = total > 0 ? (bookings / total) * chartWidth : chartWidth / 2;
  const gradient1 = ctx.createLinearGradient(startX, y, startX + bookingsWidth, y);
  gradient1.addColorStop(0, "#dc2626");
  gradient1.addColorStop(1, "#b91c1c");
  ctx.fillStyle = gradient1;
  ctx.beginPath();
  ctx.roundRect(startX, y, bookingsWidth, chartHeight, 12);
  ctx.fill();

  // Labels below
  const labelY = y + chartHeight + 35;
  ctx.font = `400 ${width * 0.026}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.textAlign = "left";
  ctx.fillText(`Kursbuchungen: ${bookings}`, startX, labelY);
  
  ctx.textAlign = "right";
  ctx.fillText(`Open Gym: ${trainings}`, startX + chartWidth, labelY);
}

function drawHandle(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)"; // White, slightly transparent
  ctx.font = `400 ${width * 0.028}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("@risefunctionalfitness", width / 2, height - 60);
}

// Removed sparkle function - no longer used
