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

  // Draw Rise Logo
  const isStory = format === "story";
  await drawLogo(ctx, width, isStory);

  // Draw main content based on type
  await drawMainContent(ctx, width, height, options, stats);

  // Draw Instagram handle (bottom center, white)
  drawHandle(ctx, width, height, isStory);

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

  // Default: Very dark background
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, "#080607");
  bgGradient.addColorStop(0.5, "#0c090a");
  bgGradient.addColorStop(1, "#060405");
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


async function drawLogo(ctx: CanvasRenderingContext2D, width: number, isStory: boolean): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const logoHeight = isStory ? 100 : 100;
      const logoWidth = (img.width / img.height) * logoHeight;
      if (isStory) {
        const x = (width - logoWidth) / 2;
        ctx.drawImage(img, x, 120, logoWidth, logoHeight);
      } else {
        ctx.drawImage(img, 45, 45, logoWidth, logoHeight);
      }
      resolve();
    };
    img.onerror = () => {
      ctx.fillStyle = "white";
      ctx.font = `bold ${isStory ? 56 : 44}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = isStory ? "center" : "left";
      const x = isStory ? width / 2 : 30;
      ctx.fillText("RISE", x, isStory ? 160 : 60);
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

  // Unified layout for ALL types (same as streak reference)
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

  // Draw sublabel
  if (options.sublabel) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = `400 ${width * 0.028}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(options.sublabel, centerX, sublabelY);
  }

  // Draw type-specific chart
  if (options.type === "streak" && stats) {
    drawStreakChart(ctx, centerX, chartY, width, stats.currentStreak, stats.longestStreak);
  } else if (options.type === "total" && stats) {
    drawTotalChart(ctx, centerX, chartY, width, stats.totalBookings, stats.totalTrainings);
  } else if (options.type === "training") {
    drawMilestoneChart(ctx, centerX, chartY, width, parseInt(options.value) || 0);
  } else if (options.type === "weekly" && stats) {
    drawWeeklyChart(ctx, centerX, chartY, width, stats.thisWeekTrainings, stats.weeklyGoal);
  } else {
    drawGenericChart(ctx, centerX, chartY, width);
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
    // Lucide Flame icon - stroke only, no fill
    ctx.fillStyle = "transparent";
    const flamePath = new Path2D("M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z");
    ctx.stroke(flamePath);
    
  } else if (type === "training" || type === "total") {
    // Dumbbell icon
    ctx.beginPath();
    ctx.moveTo(6, 12);
    ctx.lineTo(18, 12);
    ctx.stroke();
    ctx.strokeRect(3, 8, 4, 8);
    ctx.strokeRect(17, 8, 4, 8);
    
  } else if (type === "weekly") {
    // Calendar/check icon
    ctx.beginPath();
    ctx.roundRect(3, 4, 18, 18, 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(3, 9);
    ctx.lineTo(21, 9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(16, 2);
    ctx.lineTo(16, 6);
    ctx.moveTo(8, 2);
    ctx.lineTo(8, 6);
    ctx.stroke();
    // Checkmark inside
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(9, 15);
    ctx.lineTo(11, 17);
    ctx.lineTo(15, 13);
    ctx.stroke();
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

function drawHandle(ctx: CanvasRenderingContext2D, width: number, height: number, isStory: boolean): void {
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.font = `400 ${width * 0.028}px system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = "bottom";
  if (isStory) {
    ctx.textAlign = "center";
    ctx.fillText("@risefunctionalfitness", width / 2, height - 30);
  } else {
    ctx.textAlign = "right";
    ctx.fillText("@risefunctionalfitness", width - 30, height - 20);
  }
}

// Milestone chart - shows only nearby milestones for relevance
function drawMilestoneChart(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  width: number,
  currentValue: number
): void {
  const allMilestones = [10, 25, 50, 100, 150, 200, 300, 500];
  
  // Show only a window of milestones around the current value (max 5)
  const nextIdx = allMilestones.findIndex(m => m > currentValue);
  const startIdx = Math.max(0, (nextIdx === -1 ? allMilestones.length : nextIdx) - 3);
  const endIdx = Math.min(allMilestones.length, startIdx + 5);
  const milestones = allMilestones.slice(startIdx, endIdx);

  const chartWidth = width * 0.6;
  const startX = centerX - chartWidth / 2;
  const dotRadius = width * 0.014;
  const spacing = milestones.length > 1 ? chartWidth / (milestones.length - 1) : 0;

  // Draw connecting line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(startX, y + dotRadius);
  ctx.lineTo(startX + chartWidth, y + dotRadius);
  ctx.stroke();

  // Draw filled portion
  const filledCount = milestones.filter(m => currentValue >= m).length;
  if (filledCount > 0 && milestones.length > 1) {
    const filledWidth = (filledCount - 1) * spacing;
    const gradient = ctx.createLinearGradient(startX, y, startX + filledWidth, y);
    gradient.addColorStop(0, "#6b1c1c");
    gradient.addColorStop(1, "#dc2626");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX, y + dotRadius);
    ctx.lineTo(startX + filledWidth, y + dotRadius);
    ctx.stroke();
  }

  // Draw milestone dots
  milestones.forEach((milestone, i) => {
    const x = startX + i * spacing;
    const reached = currentValue >= milestone;
    
    ctx.beginPath();
    ctx.arc(x, y + dotRadius, dotRadius, 0, Math.PI * 2);
    if (reached) {
      const g = ctx.createRadialGradient(x, y + dotRadius, 0, x, y + dotRadius, dotRadius);
      g.addColorStop(0, "#dc2626");
      g.addColorStop(1, "#991b1b");
      ctx.fillStyle = g;
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  });

  // Labels
  const labelY2 = y + dotRadius * 2 + 28;
  ctx.font = `400 ${width * 0.022}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.textAlign = "center";
  milestones.forEach((milestone, i) => {
    const x = startX + i * spacing;
    ctx.fillText(`${milestone}`, x, labelY2);
  });
}

// Generic ascending bar chart (same style as streak chart but without labels)
function drawGenericChart(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  width: number
): void {
  const chartWidth = width * 0.6;
  const chartHeight = width * 0.14;
  const startX = centerX - chartWidth / 2;
  const barCount = 8;
  const barWidth = (chartWidth / barCount) * 0.80;
  const barGap = (chartWidth / barCount) * 0.20;

  for (let i = 0; i < barCount; i++) {
    const progress = (i + 1) / barCount;
    const barHeight = chartHeight * (0.25 + progress * 0.75);
    const x = startX + i * (barWidth + barGap);
    const barY = y + chartHeight - barHeight;

    const gradient = ctx.createLinearGradient(x, barY + barHeight, x, barY);
    gradient.addColorStop(0, "#6b1c1c");
    gradient.addColorStop(0.5, "#991b1b");
    gradient.addColorStop(1, "#dc2626");
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, barY, barWidth, barHeight, 3);
    ctx.fill();
  }
}

// Weekly training chart - shows day circles for the week (Mo-So)
function drawWeeklyChart(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  width: number,
  completed: number,
  goal: number
): void {
  const days = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const dotRadius = width * 0.022;
  const totalWidth = days.length * (dotRadius * 2 + 16) - 16;
  const startX = centerX - totalWidth / 2;

  days.forEach((day, i) => {
    const x = startX + i * (dotRadius * 2 + 16) + dotRadius;
    const isCompleted = i < completed;
    const isGoal = i < goal;

    // Draw circle
    ctx.beginPath();
    ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
    if (isCompleted) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, dotRadius);
      g.addColorStop(0, "#dc2626");
      g.addColorStop(1, "#991b1b");
      ctx.fillStyle = g;
      ctx.fill();
      // Checkmark
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x - dotRadius * 0.35, y);
      ctx.lineTo(x - dotRadius * 0.05, y + dotRadius * 0.3);
      ctx.lineTo(x + dotRadius * 0.4, y - dotRadius * 0.3);
      ctx.stroke();
    } else if (isGoal) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.fill();
      ctx.strokeStyle = "rgba(220, 38, 38, 0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Day label
    ctx.fillStyle = isCompleted ? "rgba(255, 255, 255, 0.9)" : "rgba(255, 255, 255, 0.4)";
    ctx.font = `400 ${width * 0.018}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(day, x, y + dotRadius + 18);
  });
}

// Removed sparkle function - no longer used
