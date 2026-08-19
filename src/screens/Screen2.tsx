"use client";

import { motion } from "framer-motion";
import GradientText from "@/components/GradientText";
import { blurInVariants } from "./motion";

export default function Screen2() {
  return (
    <motion.div
      className="relative h-full w-full overflow-hidden rounded-[44px]"
      style={{
        background:
          "linear-gradient(to bottom, var(--bg-screen-start), var(--bg-screen-end))",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.2 } }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
    >
      <div className="absolute left-1/2 top-[50%] w-full -translate-x-1/2 -translate-y-1/2 px-8 text-center">
        <motion.h2
          variants={blurInVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="text-[22px] font-medium leading-[28px] tracking-[-0.04em] text-[color:var(--ink)]"
        >
          All your life,
          <br />
          you&rsquo;ve been your own travel agent.
        </motion.h2>

        <motion.div
          variants={blurInVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ delay: 0.35 }}
          className="mt-8 text-[15px] font-semibold leading-[22px] tracking-[-0.02em]"
        >
          <GradientText as="p" shine>
            Filling visa forms. Hunting slots. Tracking fares. Comparing hotels.
          </GradientText>
        </motion.div>
      </div>
    </motion.div>
  );
}
