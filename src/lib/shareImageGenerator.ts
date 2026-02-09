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
  await drawMainContent(ctx, width, height, options, stats);

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

async function drawMainContent(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: ShareImageOptions,
  stats?: UserStats | null
): Promise<void> {
  const isStory = height > width;
  const centerX = width / 2;
  
  // Calculate vertical positions - stacked layout like reference
  const iconY = isStory ? height * 0.28 : height * 0.30;
  const labelY = isStory ? height * 0.40 : height * 0.44;
  const valueY = isStory ? height * 0.48 : height * 0.54;
  const sublabelY = isStory ? height * 0.54 : height * 0.60;
  const chartY = isStory ? height * 0.68 : height * 0.74;

  // Draw main icon (uniform for all types)
  drawMainIcon(ctx, centerX, iconY, options.type, width * 0.20);

  // For streak: "Streak" label, then "X Wochen" value
  if (options.type === "streak" && stats) {
    // Draw label (red, bold) - "Streak"
    ctx.fillStyle = "#dc2626";
    ctx.font = `700 ${width * 0.055}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Streak", centerX, labelY);

    // Draw main value (larger, white, bold) - "X Wochen"
    ctx.fillStyle = "white";
    ctx.font = `700 ${width * 0.095}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(`${stats.currentStreak} Wochen`, centerX, valueY);

    // Draw sublabel
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = `400 ${width * 0.028}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(`Längster: ${stats.longestStreak} Wochen`, centerX, sublabelY);
    
    // Draw chart with arrow
    drawStreakChart(ctx, centerX, chartY, width, stats.currentStreak, stats.longestStreak);
  } else {
    // Original logic for other types
    // Draw label (red, bold)
    ctx.fillStyle = "#dc2626";
    ctx.font = `700 ${width * 0.055}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(options.label, centerX, labelY);

    // Draw main value (larger, white, bold)
    ctx.fillStyle = "white";
    ctx.font = `700 ${width * 0.095}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(options.value, centerX, valueY);

    if (options.type === "total" && stats) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.font = `400 ${width * 0.028}px system-ui, -apple-system, sans-serif`;
      ctx.fillText(`Kurse: ${stats.totalBookings} | Open Gym: ${stats.totalTrainings}`, centerX, sublabelY);
      
      drawTotalChart(ctx, centerX, chartY, width, stats.totalBookings, stats.totalTrainings);
    } else if (options.sublabel) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.font = `400 ${width * 0.028}px system-ui, -apple-system, sans-serif`;
      ctx.fillText(options.sublabel, centerX, sublabelY);
    }
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
  
  // Scale factor for 24px base icon
  const scale = size / 24;
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(scale, scale);
  
  ctx.fillStyle = "white";
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  
  if (type === "streak") {
    // Lucide Flame icon path - standard flame shape
    ctx.beginPath();
    // Main flame body
    ctx.moveTo(12, 2);
    ctx.bezierCurveTo(12, 2, 8.5, 6, 8.5, 10);
    ctx.bezierCurveTo(8.5, 12, 9.5, 14, 12, 14);
    ctx.bezierCurveTo(14.5, 14, 15.5, 12, 15.5, 10);
    ctx.bezierCurveTo(15.5, 6, 12, 2, 12, 2);
    ctx.closePath();
    ctx.fill();
    
    // Outer flame
    ctx.beginPath();
    ctx.moveTo(12, 22);
    ctx.bezierCurveTo(17, 22, 20, 18, 20, 14);
    ctx.bezierCurveTo(20, 10, 18, 6, 14, 2);
    ctx.bezierCurveTo(14, 6, 12, 8, 12, 10);
    ctx.bezierCurveTo(12, 8, 10, 6, 10, 2);
    ctx.bezierCurveTo(6, 6, 4, 10, 4, 14);
    ctx.bezierCurveTo(4, 18, 7, 22, 12, 22);
    ctx.closePath();
    ctx.fill();
    
  } else if (type === "training" || type === "total") {
    // Dumbbell icon
    ctx.beginPath();
    ctx.moveTo(6, 12);
    ctx.lineTo(18, 12);
    ctx.stroke();
    
    // Left weight
    ctx.strokeRect(3, 8, 4, 8);
    // Right weight  
    ctx.strokeRect(17, 8, 4, 8);
    
  } else {
    // Trophy icon
    ctx.beginPath();
    ctx.moveTo(6, 3);
    ctx.lineTo(18, 3);
    ctx.lineTo(18, 8);
    ctx.bezierCurveTo(18, 13, 15, 15, 12, 16);
    ctx.bezierCurveTo(9, 15, 6, 13, 6, 8);
    ctx.lineTo(6, 3);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(12, 16);
    ctx.lineTo(12, 20);
    ctx.moveTo(8, 20);
    ctx.lineTo(16, 20);
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
  const chartHeight = width * 0.16;
  const startX = centerX - chartWidth / 2;
  const barCount = 10;
  const barWidth = (chartWidth / barCount) * 0.80;
  const barGap = (chartWidth / barCount) * 0.20;

  // Draw bars with gradient heights (ascending pattern)
  for (let i = 0; i < barCount; i++) {
    const progress = (i + 1) / barCount;
    const barHeight = chartHeight * (0.30 + progress * 0.70);
    const x = startX + i * (barWidth + barGap);
    const barY = y + chartHeight - barHeight;

    // Red gradient for each bar
    const gradient = ctx.createLinearGradient(x, barY + barHeight, x, barY);
    gradient.addColorStop(0, "#6b1c1c");
    gradient.addColorStop(0.5, "#991b1b");
    gradient.addColorStop(1, "#dc2626");
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, barY, barWidth, barHeight, 3);
    ctx.fill();
  }

  // Draw trend line with arrow on top
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  
  for (let i = 0; i < barCount; i++) {
    const progress = (i + 1) / barCount;
    const barHeight = chartHeight * (0.30 + progress * 0.70);
    const x = startX + i * (barWidth + barGap) + barWidth / 2;
    const lineY = y + chartHeight - barHeight - 6;
    
    if (i === 0) {
      ctx.moveTo(x, lineY);
    } else {
      ctx.lineTo(x, lineY);
    }
  }
  
  // Arrow pointing up-right
  const lastBarX = startX + (barCount - 1) * (barWidth + barGap) + barWidth / 2;
  const lastBarHeight = chartHeight * (0.30 + 1 * 0.70);
  const lastLineY = y + chartHeight - lastBarHeight - 6;
  
  const arrowEndX = lastBarX + 30;
  const arrowEndY = lastLineY - 20;
  ctx.lineTo(arrowEndX, arrowEndY);
  ctx.stroke();
  
  // Arrow head
  ctx.beginPath();
  ctx.moveTo(arrowEndX, arrowEndY);
  ctx.lineTo(arrowEndX - 10, arrowEndY + 4);
  ctx.lineTo(arrowEndX - 4, arrowEndY + 10);
  ctx.closePath();
  ctx.fillStyle = "white";
  ctx.fill();

  // Labels below chart
  const labelY = y + chartHeight + 35;
  ctx.font = `400 ${width * 0.024}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
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
