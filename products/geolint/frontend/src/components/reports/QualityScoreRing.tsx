import { motion } from 'framer-motion'

interface QualityScoreRingProps {
  score: number
  size?: number
  strokeWidth?: number
}

function scoreToGrade(score: number): string {
  if (score >= 97) return 'A+'
  if (score >= 93) return 'A'
  if (score >= 90) return 'A-'
  if (score >= 87) return 'B+'
  if (score >= 83) return 'B'
  if (score >= 80) return 'B-'
  if (score >= 77) return 'C+'
  if (score >= 73) return 'C'
  if (score >= 70) return 'C-'
  if (score >= 60) return 'D'
  return 'F'
}

function scoreToColor(score: number): string {
  if (score >= 90) return '#10B981'
  if (score >= 80) return '#34D399'
  if (score >= 70) return '#FBBF24'
  if (score >= 60) return '#F97316'
  return '#EF4444'
}

export default function QualityScoreRing({
  score,
  size = 160,
  strokeWidth = 12,
}: QualityScoreRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const progress = Math.min(Math.max(score, 0), 100) / 100
  const dashoffset = circumference * (1 - progress)
  const color = scoreToColor(score)
  const grade = scoreToGrade(score)

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashoffset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span
          className="text-3xl font-bold"
          style={{ color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {Math.round(score)}
        </motion.span>
        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{grade}</span>
      </div>
    </div>
  )
}
