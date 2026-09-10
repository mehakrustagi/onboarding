/* The MyTrip scroll column — Figma 947:26137, 440×8137.
 *
 * Transcribed as data rather than laid out absolutely. The Figma frame is
 * 159 text nodes across 8137px, but it is seven repetitions of one
 * structure with a handful of optional parts, and hand-placing that would
 * produce a file nobody can change: every copy edit would shift the
 * hundreds of coordinates below it.
 *
 * The structure, read off the frame:
 *
 *   SECTION   a card carrying an agent's name, what it is doing, and a
 *             status pill — WATCHING / WAITING / DONE
 *     GROUP   an optional heading inside the section, used where a
 *             section covers several legs or cities ("BLR ➔ SYD",
 *             "Sydney"), with a subtitle beneath it
 *       ITEM  one thing an agent did or is doing: a title, sometimes a
 *             when/how-many line, a body, sometimes a sources chip
 *     LINK    "View 4 Flight options" — a lone centred link
 *     ACTIONS a row of one or two buttons
 *     ADD     "+ Add Route" — the section's trailing affordance
 *
 * Copy is verbatim from the node names, including the design's own
 * inconsistencies ("1 Sources", "Forex Agents is working" vs "Safety
 * agents is working"). Those are the designer's text and not mine to
 * silently correct — if they are typos they should be fixed in Figma so
 * the two stay in sync.
 */

export type SourceChip = { label: string; faces: number };

/** The two rows that open a bottom sheet when their node is tapped. */
export type InfoSheetKey = "visa-delivery" | "flight-booking";

export type TripItem = {
  /* Optional: in forex, eSim and Safety the rail node and the heading are
     the same row, so the group carries both and the item beneath is only a
     status line and its body. Giving those items a title too would draw a
     second node and repeat the heading. */
  title?: string;
  /** "27th Jun • 11:30 AM - 2:00 PM (3 Adults)" — split as Figma has it. */
  when?: { date: string; time: string; party?: string };
  /** The "05 more" pill under the title. */
  more?: string;
  status?: string;
  /** Prefixes the status line with the call glyph, as the visa row has. */
  call?: boolean;
  /** Agent orbs parked at the right of the status row. Figma attaches
      these to rows an agent is actively working, and the eSim row carries
      two stacked. */
  agents?: number;
  body?: string | string[];
  /** Duration on the voice-note player, e.g. "1:23". */
  audio?: string;
  sources?: SourceChip;
  /** Filled node on the rail — a black tile with a tick, not a circle. */
  done?: boolean;
  /** Tapping this row's rail node opens the matching bottom sheet
      (Figma 947:38726 and 947:40652). Only the two rows the design gives a
      sheet to carry it — the node is inert everywhere else, which is what
      keeps it from promising a panel that does not exist. */
  sheet?: InfoSheetKey;
  /** Expanded copy for the detail view (947:43798). Figma writes the call
      log out in full there and abbreviates it in the column, so the two are
      different strings rather than the same one truncated. Falls back to
      `body`. */
  detail?: string;
  /** Substrings of `detail` the design sets in black against the #808080
      run. Matched literally, in order. */
  emphasis?: string[];
  /** The title IS the live status, so it takes the colour gradient the
      status lines use. Rows with a separate `status` put the gradient
      there instead; these have no status line of their own. */
  live?: boolean;
};

export type TripGroup = {
  heading?: string;
  subtitle?: string;
  /* Which marker the heading row carries.
     "dot"  — the 14px ring-and-dot; items below carry their own nodes.
              Transport, Accommodation and Activities work this way.
     "done" — the heading IS the node row, a full 30px tile with a tick,
              and the items below have none. Forex, eSim and Safety. */
  marker?: "dot" | "done";
  /* Chevron after the heading, as "Travel Card >" has. */
  chevron?: boolean;
  items: TripItem[];
  link?: string;
  actions?: string[];
};

export type TripSection = {
  key: string;
  name: string;
  working: string;
  state: "WATCHING" | "WAITING" | "DONE";
  /** Which orb art fronts the section card. */
  orb: string;
  groups: TripGroup[];
  add?: string;
};

const ORB_A = "/assets/trips/orb-1.png";
const ORB_B = "/assets/trips/orb-2.png";
const ORB_C = "/assets/trips/orb-3.png";

export const TRIP_SECTIONS: TripSection[] = [
  {
    key: "visa",
    name: "Australia Visa",
    working: "Visa monitoring agent is working on 2 task...",
    state: "WATCHING",
    orb: ORB_A,
    groups: [
      {
        items: [
          {
            title: "Visa Delivery",
            sheet: "visa-delivery",
            more: "05 more",
            call: true,
            agents: 1,
            audio: "1:23",
            status: "Called customer care...",
            body: "Spoke with a consular officer (+91 7283763812). Confirmed that your application is on track. Follow-up scheduled for tomorrow",
            detail:
              "Spoke with embassy agent on +91 7283763812 and confirmed that everything is on track with your visa. Will follow up again tomorrow.",
            emphasis: ["+91 7283763812", "Will follow up again tomorrow."],
            sources: { label: "3 Sources", faces: 2 },
          },
        ],
        actions: ["Call Embassy Tomorrow", "Track Application"],
      },
      {
        items: [
          {
            title: "Atlys Protect",
            status: "Activated visa assurance",
            body: "100% Visa Guarantee active. If your visa isn't approved on time, Atlys Protect guarantees a full refund on all your trip bookings.",
            sources: { label: "1 Source", faces: 1 },
            done: true,
          },
        ],
        actions: ["What's covered?", "Download Policy PDF"],
      },
    ],
  },
  {
    key: "transport",
    name: "Transport",
    working: "Flight & check-in agents are working on 2 task...",
    state: "WATCHING",
    orb: ORB_B,
    groups: [
      {
        heading: "BLR ➔ SYD",
        marker: "dot",
        subtitle: "24th Jun • 07:15 AM Departure",
        items: [
          {
            title: "Flight Booked",
            sheet: "flight-booking",
            body: "QF81 • Qantas Airways (Economy)",
            sources: { label: "1 Sources", faces: 1 },
            done: true,
          },
          {
            title: "Web Check-In",
            status: "Check-in opens in 14 hours",
            body: "AI will automatically secure your preferred aisle seat (14A) as soon as the portal opens.",
            sources: { label: "1 Sources", faces: 1 },
          },
        ],
        actions: ["Send Passes to WhatsApp", "Change Seat Preference"],
      },
      {
        heading: "SYD ➔ MEL",
        marker: "dot",
        subtitle: "28th Jun • 02:30 PM Departure",
        items: [
          {
            title: "Inter-City Flight",
            status: "Watching lowest fare price...",
            body: "Monitored major booking engines for QF435 and unlocked a lower fare, saving you ₹3,200",
            sources: { label: "1 Sources", faces: 1 },
          },
        ],
        link: "View 4 Flight options",
        actions: ["Filter Flight Times", "Set Max Budget"],
      },
      {
        heading: "MEL ➔ BLR",
        marker: "dot",
        subtitle: "1st Aug • 11:00 PM Departure",
        items: [
          {
            title: "Return Flight",
            status: "Waiting for flight details...",
            body: "Once your Sydney ➔ Melbourne flight is confirmed, AI will align timings and suggest the best return routes.",
          },
        ],
        actions: ["Set Preferred Airline", "Find Return Flights"],
      },
    ],
    add: "+ Add Route",
  },
  {
    key: "stay",
    name: "Accommodation",
    working: "Hotel & Food agents are working on 2 task...",
    state: "WAITING",
    orb: ORB_C,
    groups: [
      {
        heading: "Sydney",
        marker: "dot",
        subtitle: "24th Jun - 28th Jun • 4 Nights",
        items: [
          {
            title: "Hotel Booked",
            body: "Marriott Bonvoy, Sydney Deluxe King Room • Complimentary Breakfast",
            sources: { label: "1 Sources", faces: 1 },
            done: true,
          },
          {
            title: "Hotel check-In",
            status: "Arrival & Check-In Gap Detected",
            body: "Flight QF81 lands at 07:15 AM, but hotel check-in is at 03:00 PM (8-hour gap) Would you like AI to request early check-in or arrange luggage storage?",
            sources: { label: "1 Sources", faces: 1 },
          },
        ],
        actions: ["Request Early Check-In", "Hold Luggage at Hotel"],
      },
      {
        heading: "Melbourne",
        marker: "dot",
        subtitle: "28th Jun - 01st Aug • 4 Nights",
        items: [
          {
            title: "Hotel booking",
            agents: 1,
            status: "Watching lowest nightly rates...",
            body: "Found a top-rated 4-star stay near the Yarra River saving you ₹8,500 compared to average nightly rates.",
            sources: { label: "1 Sources", faces: 1 },
          },
        ],
        link: "View 6 Hotel Options",
        actions: ["Filter by Neighborhood", "Set Max Nightly Rate"],
      },
    ],
    add: "+ Add New Stay",
  },
  {
    key: "activities",
    name: "Activities",
    working: "Activity & Food agents are working on 2 task...",
    state: "WATCHING",
    orb: ORB_A,
    groups: [
      {
        heading: "Sydney",
        marker: "dot",
        subtitle: "24th Jun - 28th Jun",
        items: [
          {
            title: "Opera house tour booked",
            when: { date: "27th Jun", time: "11:30 AM - 2:00 PM", party: "(3 Adults)" },
            status: "Tickets secured & synced to calendar",
            body: "Secured early-bird tickets saving 15%. Passes have been stored in your Travel Vault and sent to your email.",
            sources: { label: "1 Sources", faces: 1 },
            done: true,
          },
          {
            title: "Quay Dining Reservation",
            when: { date: "28th Jun", time: "7:30 PM", party: "(2 Adults)" },
            status: "Table reserved matching preferences",
            body: "Table reserved at Quay Sydney matching your dietary preferences. Confirmation details are saved in your Travel Vault.",
            sources: { label: "1 Sources", faces: 1 },
            done: true,
          },
        ],
        actions: ["Send Passes to WhatsApp", "Suggest Indoor Alternatives"],
      },
      {
        heading: "Melbourne",
        marker: "dot",
        subtitle: "28th Jun - 1st Aug",
        items: [
          {
            title: "Great Ocean Road Tour Watching",
            when: { date: "29th Jun", time: "1:30 PM", party: "(3 Adults)" },
            status: "Tickets secured & synced to calendar",
            body: "Your e-tickets have been added to your Vault and sent to your email.",
            sources: { label: "1 Sources", faces: 1 },
            done: true,
          },
          {
            title: "Checking best activities & price drop for small group",
            live: true,
            body: "Tracking price drops and complimentary add-ons for small-group tours matching your schedule.",
            sources: { label: "3 Sources", faces: 2 },
          },
        ],
        link: "View 5 Activity options",
        actions: ["Suggest Nearby Food Options", "Check for Afternoon"],
      },
    ],
    add: "+ Add New City",
  },
  {
    key: "forex",
    name: "Forex/currency",
    working: "Forex Agents is working on 2 task...",
    state: "DONE",
    orb: ORB_B,
    groups: [
      {
        heading: "Travel Card",
        subtitle: "HDFC Infinia •••• 2424",
        marker: "done",
        chevron: true,
        items: [
          {
            status: "Card Optimization Analyzed",
            live: true,
            agents: 1,
            body: "Your HDFC Infinia charges a 2% forex mark-up but earns 3.3% in rewards points, netting you a 1.3% net positive return on every international transaction.",
            sources: { label: "3 Sources", faces: 2 },
          },
        ],
        actions: ["View Reward Breakdown", "Add Another Card"],
      },
      {
        heading: "Physical Currency",
        subtitle: "AUD 2,000 = ₹130434.26",
        marker: "done",
        items: [
          {
            status: "AUD 2,000 Order Dispatched",
            live: true,
            agents: 1,
            body: "Locked in the lowest exchange rate. Cash delivery is on its way via BookMyForex. Tracking details sent to your email.",
            sources: { label: "3 Sources", faces: 2 },
          },
        ],
        link: "Track Order",
        actions: ["Change Delivery Address", "View Receipt"],
      },
    ],
  },
  {
    key: "esim",
    name: "eSim/Network",
    working: "Network Agents is working on 2 task...",
    state: "WATCHING",
    orb: ORB_C,
    groups: [
      {
        heading: "eSim",
        marker: "done",
        items: [
          {
            more: "05 more",
            status: "Complimentary Data Unlocked",
            live: true,
            agents: 2,
            body: "Activated your complimentary 1GB starter data pass from Atlys. Tap below to install your eSIM before departure.",
            sources: { label: "3 Sources", faces: 2 },
          },
        ],
        link: "Install eSim",
        actions: ["Add Unlimited Top-Up", "Check Data Balance"],
      },
    ],
  },
  {
    key: "safety",
    name: "Safety & Cover",
    working: "Safety agents is working on 1 task...",
    state: "DONE",
    orb: ORB_A,
    groups: [
      {
        heading: "Atlys Cover",
        marker: "done",
        items: [
          {
            status: "24/7 Global Travel Assistance Active",
            done: true,
            /* Two labelled blocks, not one run-on sentence — Figma sets
               them as separate paragraphs. */
            body: [
              "Medical:\nInstant doctor consultations & hospital placement support",
              "Passport Loss:\nPriority embassy connection & expedited replacement support",
            ],
            sources: { label: "1 Source", faces: 1 },
          },
        ],
        actions: ["View Full Policy", "Contact 24/7 Helpline"],
      },
    ],
  },
];
