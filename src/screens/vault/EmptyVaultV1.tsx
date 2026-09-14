"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Bar, Ruler } from "./skeleton";

/* Trip Vault, empty — version 1. Figma 13463:7884 (sheet 13463:8332).
 *
 * A short sheet: three placeholder day-rows, the pitch, and one CTA. The
 * placeholder stack is the illustration — there is no separate hero — so
 * it carries the whole "this is what it will look like" job, which is why
 * it is animated rather than drawn flat. The reasoning for the motion
 * lives in skeleton.tsx.
 *
 * Geometry, read off the node against the 440×965 shell:
 *
 *   sheet     440.9 wide from y456.07, r44 at the top only
 *   ruler     ticks at x66.84, 3 tall, r10, #d9dbdd, from y569.16, pitch
 *             11.47 — plus one stray 2.16-wide tick at y754, which is the
 *             timeline continuing past the fan
 *   rows      240×60 at x100.18, r16, #f2f2f2 at 60%, tops 506.07 /
 *             586.54 / 667 — pitch 80.47
 *   in a row  SEP label 10px bold 0.8 #b2b2b2 at +10; bars 140×8 and
 *             80×8 r50 #d9dbdd at +29 and +42, x115.18
 *   stack     rows fade 1 / .6 / .42 down the pile
 *   title     Your Trip Vault 16/20 -0.64 #090909 at (167.68, 767)
 *   body      12/16 -0.12 #999 centred, w300.3, at y802
 *   CTA       264.21×51 at (91.12, 864), white, #e5e5e5, r65
 */

const A = "/assets/vault";

const SHEET_TOP = 456.07;

const ROWS = [
  { top: 506.07, label: "Sep 23", o: 1 },
  { top: 586.54, label: "Sep 25", o: 0.6 },
  { top: 667, label: "Sep 26", o: 0.42 },
] as const;

export default function EmptyVaultV1({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="absolute inset-0" style={{ zIndex: 4 }}>
      {/* The sheet. Square at the bottom because the shell's own 44px
          corner clips it — rounding it twice leaves a bright crescent in
          each bottom corner where the two radii disagree. */}
      <div
        className="absolute"
        style={{
          left: 0,
          right: 0,
          top: SHEET_TOP,
          bottom: 0,
          background: "#ffffff",
          borderRadius: "44px 44px 0 0",
          boxShadow: "0px -10px 40px -8px rgba(0,0,0,0.12)",
        }}
      />
      {/* Grabber. Not a control — this sheet does not dismiss — but the
          affordance is what tells you the trip view is still behind it
          rather than gone. */}
      <div
        className="absolute rounded-full"
        style={{ left: 208, top: SHEET_TOP + 14, width: 24, height: 3, background: "#d6d9dc" }}
      />

      <Ruler x={66.84} y={569.16} />
      {/* The fan is a window onto a longer timeline, so one tick carries
          on past it. Figma puts a single 2.16-wide mark 93px below the
          last one — far enough down to read as "and it keeps going". */}
      <div
        className="absolute"
        style={{ left: 66.84, top: 754, width: 2.16, height: 3, borderRadius: 10, background: "#d9dbdd", opacity: 0.2 }}
      />

      {ROWS.map((row, i) => (
        <motion.div
          key={row.label}
          className="absolute inset-0"
          initial={{ opacity: row.o }}
          animate={{ opacity: row.o }}
        >
          <div
            className="absolute"
            style={{
              left: 100.18,
              top: row.top,
              width: 240,
              height: 60,
              borderRadius: 16,
              background: "#f2f2f2",
              opacity: 0.6,
            }}
          />
          <p
            className="absolute whitespace-nowrap font-bold uppercase"
            style={{
              left: 115.18,
              top: row.top + 10,
              fontSize: 10,
              lineHeight: "10px",
              letterSpacing: "0.8px",
              color: "#b2b2b2",
            }}
          >
            {row.label}
          </p>
          <Bar x={115.18} y={row.top + 29} w={140} h={8} r={50} color="#d9dbdd" index={i} />
          <Bar x={115.18} y={row.top + 42} w={80} h={8} r={50} color="#d9dbdd" index={i} />
        </motion.div>
      ))}

      <p
        className="absolute whitespace-nowrap font-semibold"
        style={{
          left: 167.68,
          top: 767,
          fontSize: 16,
          lineHeight: "20px",
          letterSpacing: "-0.64px",
          color: "#090909",
        }}
      >
        Your Trip Vault
      </p>
      <p
        className="absolute text-center font-semibold"
        style={{
          left: 220.18 - 300.296 / 2,
          top: 802,
          width: 300.296,
          fontSize: 12,
          lineHeight: "16px",
          letterSpacing: "-0.12px",
          color: "#999999",
        }}
      >
        Drop any ticket, hotel voucher, or visa. Your agents organizes them into a live timeline
      </p>

      <button
        type="button"
        onClick={onUpload}
        className="absolute"
        style={{
          left: 91.12,
          top: 864,
          width: 264.212,
          height: 51,
          borderRadius: 65,
          background: "#ffffff",
          border: "1px solid #e5e5e5",
        }}
      >
        <Image
          src={`${A}/upload.svg`}
          alt=""
          width={20}
          height={20}
          style={{ position: "absolute", left: 60.1, top: 15.5, width: 20, height: 20 }}
        />
        <span
          className="absolute whitespace-nowrap font-semibold"
          style={{
            left: 85.1,
            top: 16,
            fontSize: 14,
            lineHeight: "19px",
            letterSpacing: "-0.14px",
            color: "#090909",
          }}
        >
          Upload document
        </span>
      </button>
    </div>
  );
}
