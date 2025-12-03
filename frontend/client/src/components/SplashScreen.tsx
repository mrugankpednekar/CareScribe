import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import logoReveal from "@/assets/logo-reveal.png";

export function SplashScreen() {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Hide splash screen after animation sequence (approx 3.5s)
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, 3500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                >
                    <div className="relative flex flex-col items-center justify-center">
                        {/* Heartbeat Line Animation */}
                        <svg
                            width="300"
                            height="100"
                            viewBox="0 0 300 100"
                            className="mb-8"
                        >
                            <motion.path
                                d="M0 50 L40 50 L55 20 L70 80 L85 50 L120 50 L135 20 L150 80 L165 50 L300 50"
                                fill="transparent"
                                stroke="hsl(var(--primary))"
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                transition={{
                                    duration: 2,
                                    ease: "easeInOut",
                                    times: [0, 1],
                                }}
                            />
                        </svg>

                        {/* Logo Reveal */}
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{ delay: 1.5, duration: 0.8, type: "spring" }}
                            className="relative"
                        >
                            <img
                                src={logoReveal}
                                alt="CareScribe Logo"
                                className="w-48 h-auto object-contain drop-shadow-xl"
                            />

                            {/* Shine effect */}
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                                initial={{ x: "-100%" }}
                                animate={{ x: "100%" }}
                                transition={{ delay: 2.2, duration: 1, ease: "easeInOut" }}
                                style={{ skewX: -20 }}
                            />
                        </motion.div>

                        <motion.h1
                            className="mt-4 text-2xl font-bold tracking-widest text-foreground"
                            initial={{ opacity: 0, letterSpacing: "0.5em" }}
                            animate={{ opacity: 1, letterSpacing: "0.2em" }}
                            transition={{ delay: 2, duration: 1 }}
                        >
                            CARESCRIBE
                        </motion.h1>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
