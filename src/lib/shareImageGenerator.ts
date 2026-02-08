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

  // Draw Instagram handle (bottom center)
  drawHandle(ctx, width, height);

  // Draw sparkle decoration (bottom right)
  drawSparkle(ctx, width, height);

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
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(0, 0, width, height);
        resolve();
      };
      img.onerror = reject;
      img.src = customUrl;
    });
  }

  // Default: Dark red gradient (Rise brand)
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#1a0a0a"); // Very dark red/black
  gradient.addColorStop(0.5, "#2d1515"); // Dark maroon
  gradient.addColorStop(1, "#1a0808"); // Dark red
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
      const logoHeight = 70;
      const logoWidth = (img.width / img.height) * logoHeight;
      const x = (width - logoWidth) / 2;
      ctx.drawImage(img, x, 80, logoWidth, logoHeight);
      resolve();
    };
    img.onerror = () => {
      // Fallback: Draw text
      ctx.fillStyle = "white";
      ctx.font = "bold 48px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("RISE", width / 2, 120);
      
      ctx.font = "300 20px system-ui, -apple-system, sans-serif";
      ctx.fillText("Functional Fitness", width / 2, 150);
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
  
  // Calculate vertical positions
  const iconY = isStory ? height * 0.28 : height * 0.32;
  const labelY = isStory ? height * 0.42 : height * 0.50;
  const valueY = isStory ? height * 0.50 : height * 0.60;
  const chartY = isStory ? height * 0.62 : height * 0.72;

  // Draw main icon (large, centered)
  drawMainIcon(ctx, centerX, iconY, options.type, width * 0.18);

  // Draw label (red/primary color)
  ctx.fillStyle = "#dc2626"; // red-600
  ctx.font = `500 ${width * 0.045}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(options.label, centerX, labelY);

  // Draw main value (large, white)
  ctx.fillStyle = "white";
  ctx.font = `700 ${width * 0.12}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(options.value, centerX, valueY);

  // Draw progress chart or sublabel
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
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(size / 24, size / 24);
  
  ctx.fillStyle = "white";
  
  if (type === "streak") {
    // Double-peak flame silhouette (pure white, no inner color)
    ctx.beginPath();
    // Left flame peak
    ctx.moveTo(8, 22);
    ctx.bezierCurveTo(4, 18, 3, 12, 6, 6);
    ctx.bezierCurveTo(7, 4, 9, 2, 10, 1);
    ctx.bezierCurveTo(10, 4, 11, 7, 12, 9);
    // Valley between peaks
    ctx.bezierCurveTo(12.5, 7, 13, 5, 14, 3);
    // Right flame peak
    ctx.bezierCurveTo(15, 1.5, 16, 1, 17, 2);
    ctx.bezierCurveTo(19, 4, 21, 8, 20, 14);
    ctx.bezierCurveTo(19, 18, 16, 22, 12, 22);
    ctx.bezierCurveTo(10, 22, 9, 22, 8, 22);
    ctx.closePath();
    ctx.fill();
  } else if (type === "training" || type === "total") {
    // Dumbbell icon
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    
    ctx.beginPath();
    // Bar
    ctx.moveTo(6, 12);
    ctx.lineTo(18, 12);
    // Left weight
    ctx.moveTo(4, 8);
    ctx.lineTo(4, 16);
    ctx.moveTo(7, 8);
    ctx.lineTo(7, 16);
    ctx.moveTo(4, 8);
    ctx.lineTo(7, 8);
    ctx.moveTo(4, 16);
    ctx.lineTo(7, 16);
    // Right weight
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
    ctx.beginPath();
    ctx.moveTo(6, 3);
    ctx.lineTo(18, 3);
    ctx.lineTo(18, 8);
    ctx.bezierCurveTo(18, 13, 15, 15, 12, 16);
    ctx.bezierCurveTo(9, 15, 6, 13, 6, 8);
    ctx.lineTo(6, 3);
    ctx.closePath();
    ctx.fill();
    
    // Handles
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(6, 5);
    ctx.bezierCurveTo(3, 5, 3, 9, 6, 9);
    ctx.moveTo(18, 5);
    ctx.bezierCurveTo(21, 5, 21, 9, 18, 9);
    ctx.stroke();
    
    // Base
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
  const chartWidth = width * 0.7;
  const chartHeight = width * 0.15;
  const startX = centerX - chartWidth / 2;
  const barCount = 10;
  const barWidth = (chartWidth / barCount) * 0.7;
  const barGap = (chartWidth / barCount) * 0.3;

  // Draw bars with gradient heights (ascending pattern)
  for (let i = 0; i < barCount; i++) {
    const progress = (i + 1) / barCount;
    const barHeight = chartHeight * (0.3 + progress * 0.7);
    const x = startX + i * (barWidth + barGap);
    const barY = y + chartHeight - barHeight;

    // Gradient for each bar
    const gradient = ctx.createLinearGradient(x, barY + barHeight, x, barY);
    gradient.addColorStop(0, "#7f1d1d"); // dark red
    gradient.addColorStop(1, "#dc2626"); // red-600
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, barY, barWidth, barHeight, 3);
    ctx.fill();
  }

  // Draw trend line on top of bars
  ctx.strokeStyle = "white";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < barCount; i++) {
    const progress = (i + 1) / barCount;
    const barHeight = chartHeight * (0.3 + progress * 0.7);
    const x = startX + i * (barWidth + barGap) + barWidth / 2;
    const lineY = y + chartHeight - barHeight - 5;
    
    if (i === 0) {
      ctx.moveTo(x, lineY);
    } else {
      ctx.lineTo(x, lineY);
    }
  }
  // Arrow at end
  const lastX = startX + (barCount - 1) * (barWidth + barGap) + barWidth / 2;
  const lastY = y + chartHeight * 0.05;
  ctx.lineTo(lastX + 20, lastY - 10);
  ctx.stroke();
  
  // Arrow head
  ctx.beginPath();
  ctx.moveTo(lastX + 20, lastY - 10);
  ctx.lineTo(lastX + 10, lastY - 5);
  ctx.lineTo(lastX + 15, lastY - 15);
  ctx.closePath();
  ctx.fillStyle = "white";
  ctx.fill();

  // Labels below chart - in red
  const labelY = y + chartHeight + 40;
  ctx.font = `400 ${width * 0.028}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillStyle = "#dc2626";
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
  ctx.fillStyle = "#dc2626"; // Red to match brand
  ctx.font = `400 ${width * 0.028}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("@risefunctionalfitness", width / 2, height - 80);
}

function drawSparkle(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const x = width - 60;
  const y = height - 60;
  const size = 20;

  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  
  // Draw 4-pointed star
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size * 0.3, y - size * 0.3);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x + size * 0.3, y + size * 0.3);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size * 0.3, y + size * 0.3);
  ctx.lineTo(x - size, y);
  ctx.lineTo(x - size * 0.3, y - size * 0.3);
  ctx.closePath();
  ctx.fill();
}
