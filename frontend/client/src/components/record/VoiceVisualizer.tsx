import { motion } from "framer-motion";

export function VoiceVisualizer({ isRecording }: { isRecording: boolean }) {
  return (
    <div className="flex items-center justify-center gap-1 h-16">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="w-2 bg-primary rounded-full"
          animate={isRecording ? {
            height: [10, 40, 10],
            opacity: [0.5, 1, 0.5]
          } : {
            height: 8,
            opacity: 0.3
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
}
