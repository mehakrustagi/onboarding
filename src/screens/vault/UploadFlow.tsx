"use client";

import Image from "next/image";
import { motion } from "framer-motion";

/* The four beats between "Upload document" and a document in the vault.
 * Figma section 1146:7099, frames 1555 / 1556 / 1557 / 1558.
 *
 * Every one of them is the same construction: the vault sheet, a second
 * veil over it (Rectangle 240648159 — the first veil is already sitting
 * over the trip view), and one thing on top. So the veil belongs to the
 * flow rather than to any single beat, and it stays mounted across all
 * four — which is what makes them read as one interaction rather than
 * four screens that happen to share a background.
 *
 *   picker      a 287.5 sheet: Take a Photo / Choose from Gallery /
 *               Choose a file
 *   confirm     a 654.7 sheet: the parsed ticket, Continue, Re-upload
 *   extracting  a 225×320 ticket card, empty but for three dots
 *   success     the SAME card, now carrying the booking it extracted,
 *               under a line of sparkle
 *
 * THE LAST TWO ARE ONE CARD, NOT TWO. Figma draws them as separate
 * frames at identical position and size (107.32, 322.5, 225.35×320),
 * which is the tell: the card does not leave and come back, it fills in.
 * Cross-fading two cards there would throw away the only bit of this
 * flow that carries any meaning — that the thing you are waiting on and
 * the thing you get are the same object.
 */

const A = "/assets/vault";

const IN_EASE = [0.22, 1, 0.36, 1] as const;

/* The flow's own veil, over the vault. Figma's is a flat fill; the blur
 * is here because the vault behind it is dense with type at this point
 * and a plain dim leaves it legible enough to compete with the sheet. */
export function FlowVeil({ onDismiss }: { onDismiss?: () => void }) {
  return (
    <motion.div
      className="absolute inset-0"
      style={{
        zIndex: 6,
        /* Same reading as the base veil — the vault sheet under this one
           measures 51 grey off white on every flow frame. */
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.32, ease: IN_EASE }}
      onClick={onDismiss}
    />
  );
}

/* Shared shell for the two bottom sheets. Both are 438 wide at x1 with a
 * 44 radius and a grabber 10 below their top edge; only the height and
 * the contents differ. */
function Sheet({
  top,
  height,
  children,
}: {
  top: number;
  height: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className="absolute overflow-hidden"
      style={{
        left: 1,
        top,
        width: 438,
        height,
        borderRadius: 44,
        background: "#ffffff",
        zIndex: 7,
      }}
      initial={{ y: height }}
      animate={{ y: 0 }}
      exit={{ y: height }}
      transition={{ duration: 0.42, ease: IN_EASE }}
    >
      <div
        className="absolute rounded-full"
        style={{ left: 207.45, top: 10, width: 24, height: 3, background: "#d6d9dc" }}
      />
      {children}
    </motion.div>
  );
}

const PICKER_ROWS = [
  { icon: "pick-camera", label: "Take a Photo" },
  { icon: "pick-gallery", label: "Choose from Gallery" },
  { icon: "pick-file", label: "Choose a file" },
] as const;

/* 1110:16834. Sheet 438×287.5 at y677.66; rows at 39.5 / 118.5 / 197.5
 * inside it, 79 apart, each a 40 disc at x29 with an 18 glyph and a
 * 14/19 label at x84. Dividers 324 wide at x84, 20 under each row. */
export function PickerSheet({ onPick }: { onPick: () => void }) {
  return (
    <Sheet top={677.66} height={287.5}>
      {PICKER_ROWS.map((r, i) => {
        const y = 39.5 + i * 79;
        return (
          <button
            key={r.label}
            type="button"
            onClick={onPick}
            className="absolute text-left"
            style={{ left: 29, top: y, width: 380, height: 40 }}
          >
            <Image
              src={`${A}/pick-disc.svg`}
              alt=""
              width={40}
              height={40}
              style={{ position: "absolute", left: 0, top: 0, width: 40, height: 40 }}
            />
            <Image
              src={`${A}/${r.icon}.svg`}
              alt=""
              width={18}
              height={18}
              style={{ position: "absolute", left: 11, top: 11, width: 18, height: 18 }}
            />
            <span
              className="absolute whitespace-nowrap font-semibold"
              style={{
                left: 55,
                top: 10.5,
                fontSize: 14,
                lineHeight: "19px",
                letterSpacing: "-0.14px",
                color: "#000000",
              }}
            >
              {r.label}
            </span>
          </button>
        );
      })}

      {[99, 178].map((y) => (
        <div
          key={y}
          className="absolute"
          style={{ left: 84, top: y, width: 324, height: 1, background: "#f4f5f6" }}
        />
      ))}
    </Sheet>
  );
}

/* 1110:17459. Sheet 438×654.7 at y309.46. Inside it: the title at 38,
 * rules at 87 and 460.7, the parsed document 380×313.7 at 46.7, then
 * Continue at 490.7, OR at 545.7 and Re-upload at 574.7. */
export function ConfirmSheet({
  onContinue,
  onReupload,
}: {
  onContinue: () => void;
  onReupload: () => void;
}) {
  return (
    <Sheet top={309.46} height={654.707}>
      <p
        className="absolute w-full text-center font-bold uppercase"
        style={{
          left: 0,
          top: 38,
          fontSize: 12,
          lineHeight: "14px",
          letterSpacing: "0.96px",
          color: "#0b0b0b",
        }}
      >
        Confirm Document
      </p>
      <div
        className="absolute"
        style={{ left: 30, top: 87, width: 378, height: 1, background: "#f4f5f6" }}
      />

      {/* The parsed ticket. A bitmap in the node and a bitmap here: it is
          a screenshot of a third-party voucher, so there is nothing in it
          to rebuild — every line of it is data the parser read, not UI
          this app owns. */}
      <div
        className="absolute overflow-hidden"
        style={{ left: 29, top: 103.7, width: 380, height: 313.707, borderRadius: 46.468 }}
      >
        {/* Two clips, not one. The outer rounded box is the frame; this
            inner 337.887×300 window is what crops the voucher, and the
            bitmap inside it is 153.87% of that window's height anchored
            to its top — so you get the head of the document and the rest
            is cut. Without the inner window the image simply runs on and
            collides with the Continue button. */}
        <div
          className="absolute overflow-hidden"
          style={{ left: (380 - 337.887) / 2, top: 6.85, width: 337.887, height: 300 }}
        >
          <Image
            src={`${A}/ticket-doc.png`}
            alt="Uploaded ticket"
            width={337.887}
            height={461.61}
            style={{ position: "absolute", left: 0, top: 0, width: 337.887, height: 461.61 }}
          />
        </div>
      </div>

      <div
        className="absolute"
        style={{ left: 30, top: 460.7, width: 378, height: 1, background: "#f4f5f6" }}
      />

      <button
        type="button"
        onClick={onContinue}
        className="absolute font-semibold"
        style={{
          left: 30,
          top: 490.7,
          width: 378,
          height: 40,
          borderRadius: 30,
          background: "#0b0b0b",
          border: "1px solid #d6d9dc",
          color: "#ffffff",
          fontSize: 14,
          lineHeight: "19px",
          letterSpacing: "-0.14px",
        }}
      >
        Continue
      </button>

      <p
        className="absolute w-full text-center font-bold uppercase"
        style={{
          left: 0,
          top: 545.7,
          fontSize: 11,
          lineHeight: "14px",
          letterSpacing: "0.88px",
          color: "#999999",
        }}
      >
        Or
      </p>

      <button
        type="button"
        onClick={onReupload}
        className="absolute"
        style={{
          left: 30,
          top: 574.7,
          width: 378,
          height: 40,
          borderRadius: 30,
          border: "1px solid #d6d9dc",
          background: "transparent",
        }}
      >
        <span className="flex items-center justify-center gap-1">
          <Image
            src={`${A}/upload-alt.svg`}
            alt=""
            width={18}
            height={18}
            style={{ width: 18, height: 18 }}
          />
          <span
            className="font-semibold"
            style={{
              fontSize: 14,
              lineHeight: "19px",
              letterSpacing: "-0.14px",
              color: "#000000",
            }}
          >
            Re-upload
          </span>
        </span>
      </button>
    </Sheet>
  );
}

/* The ticket card both 1557 and 1558 draw, at (107.32, 322.5) 225.35×320.
 * `filled` is the only difference between the two frames. */
export function ResultCard({ filled }: { filled: boolean }) {
  return (
    <motion.div
      className="absolute"
      style={{ left: 107.32, top: 322.5, width: 225.352, height: 320, zIndex: 7 }}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.38, ease: IN_EASE }}
    >
      {/* The ticket silhouette — white, with the two notches that make it
          a ticket rather than a card. Carries its own shadow, which is
          why it bleeds 7% wide and 9.86% low of the box. */}
      <Image
        src={`${A}/ticket-225.svg`}
        alt=""
        width={256.901}
        height={351.549}
        style={{
          position: "absolute",
          left: -225.352 * 0.07,
          top: 0,
          width: 256.901,
          maxWidth: "none",
          height: 351.549,
        }}
      />

      {filled ? (
        <>
          {/* Pastel wash pooled in the bottom third, under the action —
              the same material the vault's own cards carry, so the card
              you are handed matches the ones it is joining. */}
          <div
            className="absolute overflow-hidden"
            style={{ left: 0, top: 200, width: 225.352, height: 120, opacity: 0.3 }}
          >
            <Image
              src={`${A}/sync-grad.svg`}
              alt=""
              width={280}
              height={125}
              style={{ position: "absolute", left: -27, top: 30, width: 280, maxWidth: "none", height: 125 }}
            />
          </div>

          <div
            className="absolute"
            style={{
              left: 22.54,
              top: 22.54,
              width: 45.07,
              height: 45.07,
              borderRadius: 73.239,
              background: "#ffffff",
              border: "1.127px solid #f2f2f2",
            }}
          />
          {/* The bitmap is the full HYATT REGENCY lockup; the node crops
              it to the diamond alone with a 241%/231% blow-up pulled left
              and up (-70.58%, -24.5%). Dropped in uncropped it renders as
              an unreadable 23px wordmark. */}
          <div
            className="absolute overflow-hidden"
            style={{ left: 33.36, top: 31.55, width: 23.428, height: 27.042 }}
          >
            <Image
              src={`${A}/logo-hyatt-lg.png`}
              alt=""
              width={56.5}
              height={62.37}
              style={{
                position: "absolute",
                left: -23.428 * 0.7058,
                top: -27.042 * 0.245,
                width: 23.428 * 2.4116,
                height: 27.042 * 2.3063,
                maxWidth: "none",
              }}
            />
          </div>

          <p
            className="absolute whitespace-nowrap font-bold uppercase"
            style={{
              left: 22.54,
              top: 92.39,
              fontSize: 13.521,
              lineHeight: "15.775px",
              letterSpacing: "1.0817px",
              color: "#000000",
            }}
          >
            Check-in: 3 PM
          </p>
          <p
            className="absolute whitespace-nowrap font-semibold"
            style={{
              left: 22.54,
              top: 121.69,
              fontSize: 15.775,
              lineHeight: "21.408px",
              letterSpacing: "-0.1577px",
              color: "#000000",
            }}
          >
            Grand Hyatt hotel
          </p>
          <p
            className="absolute whitespace-nowrap font-semibold"
            style={{
              left: 22.54,
              top: 148.73,
              fontSize: 13.521,
              lineHeight: "18.028px",
              letterSpacing: "-0.1352px",
              color: "#999999",
            }}
          >
            Ref: #GH-88201
          </p>

          <div
            className="absolute"
            style={{
              left: 22.54,
              top: 229.86,
              width: 180.282,
              height: 0,
              borderTop: "1.127px dashed #e5e5e5",
            }}
          />

          <div
            className="absolute"
            style={{
              left: 22.54,
              top: 252.39,
              width: 180.282,
              height: 45.07,
              borderRadius: 73.239,
              background: "#ffffff",
              border: "1.127px solid #f2f2f2",
            }}
          >
            <p
              className="absolute w-full text-center font-semibold"
              style={{
                left: 0,
                top: 13.53,
                fontSize: 13.521,
                lineHeight: "18.028px",
                letterSpacing: "-0.1352px",
                color: "#0b0b0b",
              }}
            >
              View Booking
            </p>
          </div>
        </>
      ) : (
        <>
          {/* Three dots, centred, as the node has them. Animated because
              the frame is a still of something that has to read as work
              in progress — and unlike the empty-state placeholders, here
              something genuinely IS pending, so this one is allowed to
              look like a loader. */}
          <div
            className="absolute flex items-center justify-center gap-[5px]"
            style={{ left: 85.41, top: 122.5, width: 48.125, height: 35 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="block rounded-full"
                style={{ width: 7, height: 7, background: "#0b0b0b" }}
                animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                transition={{
                  duration: 1.05,
                  delay: i * 0.14,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
          <p
            className="absolute text-center font-semibold"
            style={{
              left: (225.352 - 125.34) / 2,
              top: 165.5,
              width: 125.34,
              fontSize: 12,
              lineHeight: "16px",
              letterSpacing: "-0.12px",
              color: "#0b0b0b",
            }}
          >
            Extracting details from doc..
          </p>
        </>
      )}
    </motion.div>
  );
}

/* 1558's headline and the light behind it. Separate from ResultCard so
 * the card can stay mounted across the two beats while this arrives. */
/* 1558's light — a shaft down the middle and a scatter of stars across
 * the top, over the same dark veil the three beats before it are on.
 *
 * Both are the node's own art. The shaft is image 26, a 1024×1536 bitmap
 * laid in at 410×614 from the top edge on `exclusion` at 30%, and the
 * stars are Group 1991427648, a set of four-point sparkles with Figma's
 * blur filters baked in. Neither is redrawable by hand: the shaft is a
 * photographic falloff and the sparkles carry per-star blur radii.
 *
 * EXCLUSION IS WHY IT HAS TO STAY DARK. exclusion(a, b) = a + b − 2ab,
 * so against a near-black backdrop it returns very nearly the source and
 * the shaft reads as light arriving. Against the white ground an earlier
 * pass put here it inverts toward its own negative and the shaft goes
 * grey and muddy — the blend mode and the dark veil are one decision,
 * not two.
 *
 * THE LIGHT ARRIVES, IT IS NOT ALREADY THERE. The shaft grows downward
 * from the top edge as the card fills in, which is what ties the two
 * together: something was added, and the screen brightened because of it.
 * Held static it reads as a backdrop the card happens to be sitting on.
 */
export function SuccessAura() {
  return (
    <>
      {/* The shaft.
       *
       * transformOrigin at the top edge so it extends DOWN into the
       * screen rather than growing from its own middle, which would read
       * as a glow swelling rather than as light coming in.
       *
       * THE RAYS MOVE. The bitmap is one fixed fan of light, and a fixed
       * fan is a texture — once it has arrived there is nothing to look
       * at. Two copies of it counter-rotating a degree or so about the
       * top edge, each breathing its own width on its own period, and the
       * rays slide through each other: where they cross, exclusion adds
       * and a brighter ray appears for a moment, then drifts apart again.
       *
       * PERIODS ARE SET BY HOW LONG THE BEAT LASTS, not by what looks
       * good in isolation. This screen is on for about two and a half
       * seconds. The first pass ran the rays on 9 and 11 second loops,
       * which is a lovely drift on a page you sit with and is, over a
       * beat this short, a still image — the fan would move perhaps two
       * tenths of a degree before the screen changed. Everything is at a
       * third of that now, so a full sweep completes while you are
       * watching. The amplitudes stay tiny (about 1.5° and 6% of width)
       * and the periods stay coprime, so the pattern still never visibly
       * repeats and no single ray can be watched travelling. It should
       * read as light that is alive, not as a graphic being animated. */}
      <motion.div
        className="pointer-events-none absolute"
        style={{
          left: 14.79,
          top: 0,
          width: 410,
          height: 614,
          zIndex: 6,
          mixBlendMode: "exclusion",
          transformOrigin: "50% 0%",
        }}
        initial={{ opacity: 0, scaleY: 0.55 }}
        animate={{ opacity: 0.3, scaleY: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.9, ease: IN_EASE }}
      >
        {[
          { rot: [-1.2, 1.2, -1.2], sx: [1, 1.06, 1], op: [1, 0.82, 1], d: 3.1, d2: 2.3 },
          { rot: [1.6, -1.6, 1.6], sx: [1.04, 0.97, 1.04], op: [0.55, 0.9, 0.55], d: 3.7, d2: 2.6 },
        ].map((r, i) => (
          <motion.div
            key={i}
            className="absolute inset-0"
            style={{ transformOrigin: "50% 0%" }}
            animate={{ rotate: r.rot, scaleX: r.sx, opacity: r.op }}
            transition={{
              rotate: { duration: r.d, repeat: Infinity, ease: "easeInOut" },
              scaleX: { duration: r.d2, repeat: Infinity, ease: "easeInOut" },
              opacity: { duration: r.d2 * 1.3, repeat: Infinity, ease: "easeInOut" },
            }}
          >
            <Image
              src={`${A}/shine.png`}
              alt=""
              width={410}
              height={614}
              style={{ width: 410, height: 614, maxWidth: "none" }}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* The stars. Figma's group sits rotated in the frame, so its
          metadata box is no use for placing it; measured off the render
          instead, the sparkles span roughly x30–410 across the top band,
          which is the 320.95 asset carried up to 380.

          ONE copy, not two. An earlier pass drew it twice — mirrored and
          offset — to fill the corners, and the result was about twenty
          small sparkles where the reference has eight larger ones. The
          node is sparse on purpose: a dense field reads as noise or as
          snow, and what this is meant to say is that something good and
          singular just happened.

          They twinkle as a group rather than individually, which is all
          one flattened SVG allows — kept slow and shallow so it reads as
          atmosphere rather than as a blinking graphic. */}
      <motion.div
        className="pointer-events-none absolute"
        style={{ left: 30, top: 0, width: 380, height: 103.9, zIndex: 6 }}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: [0.78, 1, 0.78], scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          opacity: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
          scale: { duration: 0.9, ease: IN_EASE },
        }}
      >
        <Image
          src={`${A}/sparkles.svg`}
          alt=""
          width={380}
          height={103.9}
          style={{ width: 380, height: 103.9, maxWidth: "none" }}
        />
      </motion.div>

      <motion.p
        className="absolute text-center font-semibold"
        style={{
          left: 116.54,
          top: 231.69,
          width: 203.7,
          fontSize: 18,
          lineHeight: "25px",
          letterSpacing: "-0.36px",
          color: "#ffffff",
          zIndex: 7,
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.45, delay: 0.1, ease: IN_EASE }}
      >
        Successfully added to your Itinerary
      </motion.p>
    </>
  );
}
