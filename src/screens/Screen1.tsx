"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { blurInVariants } from "./motion";

export default function Screen1() {
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
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
        <motion.div
          variants={blurInVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="flex h-20 w-20 items-center justify-center rounded-[25px] bg-white"
          style={{ boxShadow: "0px 5px 15px 0px rgba(0,0,0,0.06)" }}
        >
          <Image
            src="/assets/atlys-logo.svg"
            alt="Atlys"
            width={44}
            height={20}
            priority
            style={{ width: "44px", height: "auto" }}
          />
        </motion.div>

        <motion.p
          variants={blurInVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ delay: 0.35 }}
          className="mt-6 max-w-[244px] text-center text-[20px] font-medium leading-[25px] tracking-[-0.04em] text-[color:var(--ink)]"
        >
          You&rsquo;ve trusted Atlys with your visas
        </motion.p>
      </div>
    </motion.div>
  );
}
