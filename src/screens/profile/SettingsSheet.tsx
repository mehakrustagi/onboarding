"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ConnectorsGraph from "./ConnectorsGraph";

/* Settings — Figma node 853:18801.
 *
 * A bottom sheet over the profile, opened from the gear in the header.
 * The screen behind stays visible and blurred, which is what makes this a
 * sheet rather than a page: you can see what you'll return to.
 *
 *   handle    40×4 grab bar
 *   gear      24×24, then "SETTINGS" 11px Bold, 0.88 tracking
 *   accounts  a raised card — "Accounts center" 16px Medium over a 12px
 *             grey line, with a person mark and a disclosure chevron
 *   rows      14px Medium with a 20px leading icon and a chevron
 *   more      below a dotted rule, set apart from the list above it
 */

const IN_EASE = [0.22, 1, 0.36, 1] as const;

/* The sheet is a small navigation stack, not three separate sheets:
 *   root  → the settings list
 *   more  → Logout / Delete account (853:19104)
 *   logout→ the confirm (853:19355)
 *
 * Held as a stack rather than a single "screen" value so back always pops
 * one level and lands where you came from, whatever route you took.
 * Its height changes per page — the confirm is far shorter than the list,
 * and a sheet that stays list-height around two buttons reads as broken. */
type Page =
  | "root"
  | "more"
  | "logout"
  | "deleteReason"
  | "deleteConfirm"
  | "residence"
  | "citizenship"
  | "contact"
  | "currency"
  | "connectors";
const PAGE_HEIGHT: Record<Page, number> = {
  root: 691,
  more: 300,
  logout: 366,
  /* The reason step is tall because the keyboard would take the lower
     half on a device; the confirm is shorter since it is four lines and
     two buttons. */
  deleteReason: 560,
  deleteConfirm: 480,
  /* The pickers are tall on purpose — a scrolling list in a short sheet
     shows two rows and reads as cramped. */
  residence: 660,
  citizenship: 660,
  currency: 660,
  contact: 620,
  connectors: 903,
};

/* Pickers. Same shape, different data — one component renders all three,
 * since a country list and a currency list differ only in what sits in
 * the leading slot. */
const COUNTRIES = [
  { flag: "🇺🇸", label: "United Stated" },
  { flag: "🇦🇪", label: "United Arab Emirates" },
  { flag: "🇮🇳", label: "India" },
  { flag: "🇦🇱", label: "Albania" },
  { flag: "🇭🇺", label: "Hungary" },
  { flag: "🇯🇵", label: "Japan" },
  { flag: "🇸🇬", label: "Singapore" },
  { flag: "🇬🇧", label: "United Kingdom" },
];
const CURRENCIES = [
  { flag: "🇮🇳", label: "INR — Indian Rupee" },
  { flag: "🇺🇸", label: "USD — US Dollar" },
  { flag: "🇦🇪", label: "AED — UAE Dirham" },
  { flag: "🇪🇺", label: "EUR — Euro" },
  { flag: "🇬🇧", label: "GBP — Pound Sterling" },
  { flag: "🇸🇬", label: "SGD — Singapore Dollar" },
];

const PICKERS: Record<
  string,
  { title: string; icon: string; items: { flag: string; label: string }[] }
> = {
  residence: {
    title: "Country of residence",
    icon: "/assets/profile/st-flag.svg",
    items: COUNTRIES,
  },
  citizenship: {
    title: "Citizenship",
    icon: "/assets/profile/st-globe.svg",
    items: COUNTRIES,
  },
  currency: {
    title: "Currency",
    icon: "/assets/profile/st-coins.svg",
    items: CURRENCIES,
  },
};

/* Inside "Accounts center" once expanded (853:20332). */
const ACCOUNT_ROWS = [
  {
    icon: "/assets/profile/st-flag.svg",
    label: "Country of residence",
    page: "residence",
  },
  {
    icon: "/assets/profile/st-globe.svg",
    label: "Citizenship",
    page: "citizenship",
  },
  {
    icon: "/assets/profile/st-phone.svg",
    label: "Contact info",
    page: "contact",
  },
  { icon: "/assets/profile/st-coins.svg", label: "Currency", page: "currency" },
  {
    icon: "/assets/profile/st-db.svg",
    label: "Connectors",
    page: "connectors",
  },
];
/* Height the card grows to, and how far the list below it is pushed. */
const ACCOUNTS_EXTRA = ACCOUNT_ROWS.length * 54 + 14;

const ROWS = [
  { icon: "/assets/profile/st-edit.svg", label: "Edit Traveler" },
  { icon: "/assets/profile/st-add.svg", label: "Coupons" },
  { icon: "/assets/profile/st-gift.svg", label: "Loyalty Programs" },
  { icon: "/assets/profile/st-logout.svg", label: "Terms of Service" },
];

export default function SettingsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [stack, setStack] = useState<Page[]>(["root"]);
  const [reason, setReason] = useState("");
  const [accountsOpen, setAccountsOpen] = useState(false);
  /* Selection per picker. Keyed by page so residence and citizenship keep
     their own answer — they share a country list but not a choice. */
  const [picked, setPicked] = useState<Record<string, number>>({});
  const page = stack[stack.length - 1];
  const push = (p: Page) => setStack((s) => [...s, p]);
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  /* Straight back to the settings list, skipping the intermediate steps.
     Declining a destructive action should return you to where you were
     before you started down that path — popping one level would land on
     the reason form you just backed out of. */
  const home = () => setStack(["root"]);

  // Reopening should start at the root rather than wherever it was left.
  useEffect(() => {
    if (open) return;
    return () => {
      setStack(["root"]);
      setReason("");
      setAccountsOpen(false);
      setPicked({});
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="absolute inset-0" style={{ zIndex: 80 }}>
          {/* Scrim. Dark and blurred — the profile behind stays readable
              as shape, so the sheet reads as sitting over it. */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: "rgba(0,0,0,0.38)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              borderRadius: 44,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: IN_EASE }}
            onClick={onClose}
          />

          {/* The sheet. Rises from the bottom edge on a spring with a
              little weight — a sheet that eases in linearly reads as a
              panel being revealed rather than one being pushed up. */}
          <motion.div
            className="absolute overflow-hidden bg-white"
            style={{
              left: 0,
              right: 0,
              bottom: 0,
              borderTopLeftRadius: 40,
              borderTopRightRadius: 40,
              borderBottomLeftRadius: 44,
              borderBottomRightRadius: 44,
            }}
            initial={{ y: 691, height: PAGE_HEIGHT.root }}
            animate={{
              y: 0,
              height:
                PAGE_HEIGHT[page] +
                (page === "root" && accountsOpen ? ACCOUNTS_EXTRA : 0),
            }}
            exit={{ y: 691 }}
            transition={{
              y: { type: "spring", stiffness: 240, damping: 30, mass: 0.9 },
              // Height resizes on a tween rather than a spring: a sheet
              // that overshoots its own height wobbles at the edge, which
              // reads as a glitch rather than as bounce.
              height: { duration: 0.42, ease: IN_EASE },
            }}
          >
            {/* Grab handle */}
            <div
              className="absolute left-1/2 -translate-x-1/2"
              style={{
                top: 12,
                width: 40,
                height: 4,
                borderRadius: 2,
                background: "#d9d9de",
              }}
            />

            {/* One control, two meanings: an × at the root because there
                is nothing to go back to, an arrow deeper in because there
                is. It also moves side to side, since a back arrow on the
                right reads as "forward". */}
            <button
              type="button"
              aria-label={page === "root" ? "Close" : "Back"}
              onClick={page === "root" ? onClose : back}
              className="absolute flex items-center justify-center"
              style={{
                // Above the page layer. Each page is an `absolute
                // inset-0` wrapper rendered AFTER this button, and a
                // transparent div still captures clicks — so without a
                // z-index the back control is covered on every sub-page
                // and simply never receives the tap.
                zIndex: 10,
                left: page === "root" ? undefined : 24,
                right: page === "root" ? 24 : undefined,
                top: 36,
                width: 44,
                height: 44,
                borderRadius: 22,
                background: "#f4f4f6",
              }}
            >
              {page === "root" ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M2 2 14 14M14 2 2 14"
                    stroke="#0b0b0b"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <Image
                  src="/assets/profile/arrow-back.svg"
                  alt=""
                  width={22}
                  height={22}
                  style={{ width: 22, height: 22, display: "block" }}
                />
              )}
            </button>

            <div
              className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 flex-col items-center"
              // Connectors draws its own header at the node's own
              // positions, so the shared one steps aside rather than
              // stacking a second icon and title on top of it.
              style={{
                top: 40,
                gap: 12,
                zIndex: 9,
                opacity: page === "connectors" ? 0 : 1,
              }}
            >
              <Image
                src={
                  page === "logout"
                    ? "/assets/profile/st-logout.svg"
                    : page === "contact"
                      ? "/assets/profile/st-phone.svg"
                      : page === "connectors"
                        ? "/assets/profile/st-db.svg"
                      : (PICKERS[page]?.icon ?? "/assets/profile/st-gear.svg")
                }
                alt=""
                width={24}
                height={24}
                style={{ width: 24, height: 24, display: "block" }}
              />
              {page !== "logout" && page !== "deleteConfirm" && (
                <p
                  className="font-bold uppercase"
                  style={{
                    fontSize: 11,
                    lineHeight: "14px",
                    letterSpacing: "0.88px",
                    color: "#0b0b0b",
                  }}
                >
                  {PICKERS[page]?.title ??
                    (page === "contact"
                      ? "Contact info"
                      : page === "connectors"
                      ? "Connectors"
                      : page === "more"
                        ? "More options"
                        : page === "deleteReason"
                          ? "Delete account"
                          : "Settings")}
                </p>
              )}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {page === "root" && (
                <motion.div
                  key="root"
                  className="absolute inset-0"
                  initial={{ opacity: 0, x: -18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ duration: 0.26, ease: IN_EASE }}
                >
              {/* Accounts center — raised above the list, because it is the
                  account itself rather than one setting among many. */}
              <motion.div
                className="absolute overflow-hidden"
                style={{
                  left: 30,
                  top: 133,
                  width: 380,
                  borderRadius: 28,
                  background: "#ffffff",
                  boxShadow: "0 6px 26px 0 rgba(0,0,0,0.07)",
                }}
                animate={{ height: accountsOpen ? 140 + ACCOUNTS_EXTRA : 140 }}
                transition={{ duration: 0.36, ease: IN_EASE }}
              >
                {/* The whole header toggles, not just the chevron — a 20px
                    target inside a 380px card that clearly wants tapping
                    is a trap. Placed last with a z-index so it sits above
                    the label rather than under it, where the text would
                    swallow the click. */}
                <Image
                  src="/assets/profile/st-person.svg"
                  alt=""
                  width={22}
                  height={22}
                  className="absolute"
                  style={{ left: 26, top: 26, width: 22, height: 22 }}
                />
                <motion.div
                  className="pointer-events-none absolute"
                  style={{ right: 26, top: 27, width: 20, height: 20 }}
                  animate={{ rotate: accountsOpen ? 180 : 0 }}
                  transition={{ duration: 0.32, ease: IN_EASE }}
                >
                  <Image
                    src="/assets/profile/st-down.svg"
                    alt=""
                    width={20}
                    height={20}
                    style={{ width: 20, height: 20, display: "block" }}
                  />
                </motion.div>
                <p
                  className="absolute font-medium"
                  style={{
                    left: 26,
                    top: 71,
                    fontSize: 16,
                    lineHeight: "20px",
                    letterSpacing: "-0.32px",
                    color: "#0b0b0b",
                  }}
                >
                  Accounts center
                </p>
                <p
                  className="absolute font-medium"
                  style={{
                    left: 26,
                    top: 97,
                    fontSize: 12,
                    lineHeight: "16px",
                    letterSpacing: "-0.12px",
                    color: "#9a9aa2",
                  }}
                >
                  Residence, Citizenship, Connectors &amp; Contact Info
                </p>

                {/* Revealed rows. Faded alongside the height so they don't
                    appear to slide out from under the subtitle before
                    there is room for them. */}
                <motion.div
                  className="absolute"
                  style={{ left: 4, right: 4, top: 132 }}
                  animate={{ opacity: accountsOpen ? 1 : 0 }}
                  transition={{
                    duration: 0.26,
                    ease: IN_EASE,
                    delay: accountsOpen ? 0.1 : 0,
                  }}
                >
                  {ACCOUNT_ROWS.map((r, i) => (
                    <Row
                      key={r.label}
                      icon={r.icon}
                      label={r.label}
                      top={i * 54}
                      onClick={r.page ? () => push(r.page as Page) : undefined}
                    />
                  ))}
                </motion.div>

                <button
                  type="button"
                  aria-expanded={accountsOpen}
                  aria-label="Accounts center"
                  onClick={() => setAccountsOpen((v) => !v)}
                  className="absolute"
                  style={{ left: 0, top: 0, width: 380, height: 128, zIndex: 2 }}
                />
              </motion.div>

              {/* The list */}
              <motion.div
                className="absolute overflow-hidden"
                animate={{ y: accountsOpen ? ACCOUNTS_EXTRA : 0 }}
                transition={{ duration: 0.36, ease: IN_EASE }}
                style={{
                  left: 30,
                  top: 297,
                  width: 380,
                  height: 340,
                  borderRadius: 28,
                  background: "#fafafb",
                }}
              >
                {ROWS.map((r, i) => (
                  <Row key={r.label} icon={r.icon} label={r.label} top={22 + i * 54} />
                ))}

                {/* Dotted rule. "more" is a different kind of thing from the
                    four above it, and the rule is what says so. */}
                <div
                  className="absolute"
                  style={{
                    left: 22,
                    top: 258,
                    right: 22,
                    height: 1,
                    backgroundImage:
                      "repeating-linear-gradient(90deg, #d7d7dc 0 3px, transparent 3px 7px)",
                  }}
                />

                <Row
                  icon="/assets/profile/st-more.svg"
                  label="more"
                  top={284}
                  onClick={() => push("more")}
                />
              </motion.div>
                </motion.div>
              )}

              {page === "more" && (
                <motion.div
                  key="more"
                  className="absolute inset-0"
                  // Comes in from the right and leaves to the right: this
                  // is a level deeper, so it should arrive from the
                  // direction the chevron pointed.
                  initial={{ opacity: 0, x: 22 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 22 }}
                  transition={{ duration: 0.26, ease: IN_EASE }}
                >
                  <div
                    className="absolute"
                    style={{ left: 30, right: 30, top: 128 }}
                  >
                    <Row
                      icon="/assets/profile/st-logout.svg"
                      label="Logout"
                      top={0}
                      onClick={() => push("logout")}
                    />
                    <div
                      className="absolute"
                      style={{
                        left: 40,
                        right: 8,
                        top: 56,
                        height: 1,
                        backgroundImage:
                          "repeating-linear-gradient(90deg, #d7d7dc 0 3px, transparent 3px 7px)",
                      }}
                    />
                    <Row
                      icon="/assets/profile/st-trash.svg"
                      label="Delete account"
                      top={72}
                      danger
                      onClick={() => push("deleteReason")}
                    />
                  </div>
                </motion.div>
              )}

              {page === "logout" && (
                <motion.div
                  key="logout"
                  className="absolute inset-0"
                  initial={{ opacity: 0, x: 22 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 22 }}
                  transition={{ duration: 0.26, ease: IN_EASE }}
                >
                  <p
                    className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center font-medium"
                    style={{
                      top: 132,
                      fontSize: 18,
                      lineHeight: "22px",
                      letterSpacing: "-0.36px",
                      color: "#0b0b0b",
                    }}
                  >
                    Are you sure you want to logout
                  </p>

                  {/* Destructive first, matching the design — but it is
                      the outlined one and "Stay signed in" sits below it,
                      so the dangerous choice never looks like the default.
                      Colour carries the warning, weight carries the
                      recommendation. */}
                  <SheetButton
                    top={186}
                    label="Logout"
                    tone="danger"
                    onClick={onClose}
                  />
                  <SheetButton
                    top={250}
                    label="Stay signed in"
                    onClick={back}
                  />
                </motion.div>
              )}
              {page === "deleteReason" && (
                <motion.div
                  key="deleteReason"
                  className="absolute inset-0"
                  initial={{ opacity: 0, x: 22 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 22 }}
                  transition={{ duration: 0.26, ease: IN_EASE }}
                >
                  <p
                    className="absolute left-1/2 -translate-x-1/2 text-center font-semibold"
                    style={{
                      top: 104,
                      width: 320,
                      fontSize: 20,
                      lineHeight: "26px",
                      letterSpacing: "-0.6px",
                      color: "#0b0b0b",
                    }}
                  >
                    Tell us why do you want to delete your Atlys account
                  </p>
                  <p
                    className="absolute left-1/2 -translate-x-1/2 text-center font-medium"
                    style={{
                      top: 166,
                      width: 320,
                      fontSize: 13,
                      lineHeight: "19px",
                      color: "#a6a6ad",
                    }}
                  >
                    We would like to know so we can improve things in our
                    mission to making travel seamless
                  </p>

                  {/* Dashed rather than solid: the design marks this as an
                      area to fill rather than a filled field. */}
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter your reason here"
                    className="absolute left-1/2 -translate-x-1/2 resize-none outline-none"
                    style={{
                      top: 232,
                      width: 380,
                      height: 132,
                      borderRadius: 20,
                      border: "1px dashed #d7d7dc",
                      padding: "18px 20px",
                      fontSize: 14,
                      lineHeight: "20px",
                      letterSpacing: "-0.14px",
                      color: "#0b0b0b",
                      background: "transparent",
                    }}
                  />

                  {/* Disabled until there is a reason — the whole point of
                      the step is that it is answered, and an always-live
                      button lets you skip straight past it. */}
                  <SheetButton
                    top={412}
                    label="Delete account"
                    tone="danger"
                    icon="/assets/profile/st-trash.svg"
                    disabled={reason.trim().length === 0}
                    onClick={() => push("deleteConfirm")}
                  />
                </motion.div>
              )}

              {page === "deleteConfirm" && (
                <motion.div
                  key="deleteConfirm"
                  className="absolute inset-0"
                  initial={{ opacity: 0, x: 22 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 22 }}
                  transition={{ duration: 0.26, ease: IN_EASE }}
                >
                  <div
                    className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center"
                    style={{
                      top: 96,
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      background: "#fdeaea",
                    }}
                  >
                    <Image
                      src="/assets/profile/st-trash.svg"
                      alt=""
                      width={22}
                      height={22}
                      style={{ width: 22, height: 22, display: "block" }}
                    />
                  </div>

                  <p
                    className="absolute left-1/2 -translate-x-1/2 text-center font-semibold"
                    style={{
                      top: 172,
                      width: 330,
                      fontSize: 20,
                      lineHeight: "26px",
                      letterSpacing: "-0.6px",
                      color: "#0b0b0b",
                    }}
                  >
                    Are you sure you want to delete your atlys account?
                  </p>
                  <p
                    className="absolute left-1/2 -translate-x-1/2 text-center font-medium"
                    style={{
                      top: 236,
                      width: 330,
                      fontSize: 13,
                      lineHeight: "19px",
                      color: "#a6a6ad",
                    }}
                  >
                    Deleting your account will delete all of it&apos;s data.
                    You will have to re-enter your documents to apply for a
                    visa again.
                  </p>

                  <SheetButton
                    top={330}
                    label="Proceed to delete"
                    tone="danger"
                    onClick={onClose}
                  />
                  <SheetButton top={394} label="Don't delete" onClick={home} />
                </motion.div>
              )}
              {PICKERS[page] && (
                <motion.div
                  key={page}
                  className="absolute inset-0"
                  initial={{ opacity: 0, x: 22 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 22 }}
                  transition={{ duration: 0.26, ease: IN_EASE }}
                >
                  <Picker
                    items={PICKERS[page].items}
                    selected={picked[page] ?? 0}
                    onPick={(i) =>
                      setPicked((p) => ({ ...p, [page]: i }))
                    }
                  />
                </motion.div>
              )}

              {page === "connectors" && (
                <motion.div
                  key="connectors"
                  className="absolute inset-0"
                  initial={{ opacity: 0, x: 22 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 22 }}
                  transition={{ duration: 0.26, ease: IN_EASE }}
                >
                  <ConnectorsGraph onPanel={back} />
                </motion.div>
              )}

              {page === "contact" && (
                <motion.div
                  key="contact"
                  className="absolute inset-0"
                  initial={{ opacity: 0, x: 22 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 22 }}
                  transition={{ duration: 0.26, ease: IN_EASE }}
                >
                  <p
                    className="absolute left-1/2 -translate-x-1/2 text-center font-medium"
                    style={{
                      top: 104,
                      width: 320,
                      fontSize: 13,
                      lineHeight: "19px",
                      color: "#a6a6ad",
                    }}
                  >
                    We need your phone number to provide urgent status
                    updates on your visa application.
                  </p>

                  <Field label="Email address*" top={196}>
                    <input
                      defaultValue="Mohaknahta@gmail.com"
                      className="w-full bg-transparent outline-none"
                      style={{
                        fontSize: 15,
                        lineHeight: "22px",
                        letterSpacing: "-0.15px",
                        color: "#0b0b0b",
                      }}
                    />
                  </Field>

                  <Field label="Number" top={286}>
                    <div className="flex items-center" style={{ gap: 8 }}>
                      <span style={{ fontSize: 15 }}>🇮🇳</span>
                      <span
                        className="font-medium"
                        style={{ fontSize: 15, color: "#0b0b0b" }}
                      >
                        +91
                      </span>
                      <Image
                        src="/assets/profile/st-down.svg"
                        alt=""
                        width={14}
                        height={14}
                        style={{ width: 14, height: 14, display: "block" }}
                      />
                      <input
                        defaultValue="1234567890"
                        className="flex-1 bg-transparent outline-none"
                        style={{
                          marginLeft: 6,
                          fontSize: 15,
                          lineHeight: "22px",
                          letterSpacing: "-0.15px",
                          color: "#0b0b0b",
                        }}
                      />
                    </div>
                  </Field>

                  <SheetButton top={506} label="Confirm edit" onClick={back} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({
  icon,
  label,
  top,
  onClick,
  danger,
}: {
  icon: string;
  label: string;
  top: number;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute flex items-center"
      style={{ left: 22, right: 22, top, height: 44 }}
    >
      <Image
        src={icon}
        alt=""
        width={20}
        height={20}
        style={{ width: 20, height: 20, display: "block", flexShrink: 0 }}
      />
      <span
        className="font-medium"
        style={{
          marginLeft: 14,
          fontSize: 14,
          lineHeight: "19px",
          letterSpacing: "-0.14px",
          color: danger ? "#ef4444" : "#0b0b0b",
        }}
      >
        {label}
      </span>
      <Image
        src="/assets/profile/st-chevron.svg"
        alt=""
        width={18}
        height={18}
        className="ml-auto"
        style={{
          width: 18,
          height: 18,
          display: "block",
          opacity: 0.5,
          filter: danger
            ? "invert(38%) sepia(75%) saturate(3000%) hue-rotate(340deg)"
            : undefined,
        }}
      />
    </button>
  );
}

/* Full-width action in the confirm step. */
function SheetButton({
  top,
  label,
  tone,
  icon,
  disabled,
  onClick,
}: {
  top: number;
  label: string;
  tone?: "danger";
  icon?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center gap-[8px] font-semibold"
      style={{
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "default" : "pointer",
        top,
        width: 380,
        height: 52,
        borderRadius: 26,
        background: "#ffffff",
        border: "1px solid #ececef",
        boxShadow: "0 3px 14px 0 rgba(0,0,0,0.05)",
        fontSize: 14,
        lineHeight: "19px",
        letterSpacing: "-0.14px",
        color: tone === "danger" ? "#ef4444" : "#0b0b0b",
      }}
    >
      {icon && (
        <Image
          src={icon}
          alt=""
          width={18}
          height={18}
          style={{ width: 18, height: 18, display: "block" }}
        />
      )}
      {label}
    </button>
  );
}

/* Radio list with a search box (853:70367). One component for residence,
 * citizenship and currency: they differ only in their data. */
function Picker({
  items,
  selected,
  onPick,
}: {
  items: { flag: string; label: string }[];
  selected: number;
  onPick: (i: number) => void;
}) {
  const [q, setQ] = useState("");
  const shown = items
    .map((it, i) => ({ ...it, i }))
    .filter((it) => it.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div
        className="absolute left-1/2 flex -translate-x-1/2 items-center"
        style={{
          top: 100,
          width: 380,
          height: 48,
          borderRadius: 24,
          border: "1px solid #ececef",
          paddingLeft: 18,
          paddingRight: 18,
          gap: 10,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="4.6" stroke="#b4b4ba" strokeWidth="1.4" />
          <path
            d="m10.6 10.6 3 3"
            stroke="#b4b4ba"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search"
          className="w-full bg-transparent outline-none"
          style={{ fontSize: 15, color: "#0b0b0b" }}
        />
      </div>

      {/* Scrolls on its own so the search box stays put — a filter that
          scrolls away with its results is no use once the list is long. */}
      <div
        className="absolute left-1/2 -translate-x-1/2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ top: 164, width: 380, bottom: 24 }}
      >
        {shown.map((it) => (
          <button
            key={it.label}
            type="button"
            onClick={() => onPick(it.i)}
            className="relative flex w-full items-center"
            style={{ height: 62, gap: 14 }}
          >
            <span
              className="flex items-center justify-center"
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                border: `1.6px solid ${it.i === selected ? "#0b0b0b" : "#c9c9ce"}`,
                flexShrink: 0,
              }}
            >
              {it.i === selected && (
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    background: "#0b0b0b",
                  }}
                />
              )}
            </span>
            <span style={{ fontSize: 20, lineHeight: "24px" }}>{it.flag}</span>
            <span
              className="font-medium"
              style={{
                fontSize: 15,
                letterSpacing: "-0.15px",
                color: "#0b0b0b",
              }}
            >
              {it.label}
            </span>
            <span
              className="absolute"
              style={{
                left: 34,
                right: 0,
                bottom: 0,
                height: 1,
                backgroundImage:
                  "repeating-linear-gradient(90deg, #e2e2e6 0 3px, transparent 3px 7px)",
              }}
            />
          </button>
        ))}
      </div>
    </>
  );
}

/* Labelled field on a dotted rule (853:74814). */
function Field({
  label,
  top,
  children,
}: {
  label: string;
  top: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2"
      style={{ top, width: 380 }}
    >
      <p
        className="font-bold uppercase"
        style={{
          fontSize: 11,
          lineHeight: "14px",
          letterSpacing: "0.88px",
          color: "#0b0b0b",
        }}
      >
        {label}
      </p>
      <div style={{ marginTop: 12 }}>{children}</div>
      <div
        style={{
          marginTop: 10,
          height: 1,
          backgroundImage:
            "repeating-linear-gradient(90deg, #d7d7dc 0 3px, transparent 3px 7px)",
        }}
      />
    </div>
  );
}
