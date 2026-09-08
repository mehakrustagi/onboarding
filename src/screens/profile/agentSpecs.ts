import type { AgentSpec } from "./AgentSheet";

/* Content for the agent pull-ups. Flight is Figma 853:63443, read off the
 * node's own text nodes in document order.
 *
 * Two things in that node look like slips in the design file rather than
 * intent, and are reproduced as-is rather than silently corrected:
 *   · HEIGHT & WEIGHT carries the Seat chips verbatim (Window / Middle /
 *     Aisle / Extra legroom / Cheapest), which cannot be what it means.
 *   · "available" in the Seat note is Figma's spelling.
 */

export const FLIGHT_AGENT: AgentSpec = {
  eyebrow: "FLIGHT AGENT",
  headline: "Found 6/8 flight preferences",
  body: "You’ve flown Emirates to Dubai three times in the past year, and you’ve chosen a window seat on every one.",
  sources: "3 Sources",
  sections: [
    {
      label: "AIRLINES",
      done: true,
      chips: ["Singapore Airlines", "Emirates", "Cheapest", "+ Add"],
      on: ["Emirates"],
      note: "...I will scan flights 24x7 and get you the best deals",
    },
    {
      label: "CLASS",
      done: true,
      chips: ["Economy", "Premium economy", "Business", "First class"],
      on: ["Economy"],
      note: "...I will scan flights 24x7 and get you the best deals",
    },
    {
      label: "Seat",
      done: true,
      chips: ["Window", "Middle", "Aisle", "Extra legroom", "Cheapest"],
      on: ["Window"],
      note: "...I will look for the cheapest window seat, if not available i’ll find the next best",
    },
    {
      label: "HEIGHT & WEIGHT",
      chips: ["Window", "Middle", "Aisle", "Extra legroom", "Cheapest"],
      note: "...I will look for the cheapest window seat, if not available i’ll find the next best",
    },
    {
      label: "AIRLINE MEAL",
      done: true,
      meals: [
        { code: "AVML", desc: "vegetarian (asian)" },
        { code: "VGML", desc: "vegan, no animal products" },
        { code: "VJML", desc: "jain-no root veggies" },
        { code: "MOML", desc: "halal/muslim meal" },
        { code: "KSML", desc: "kosher, sealed on board" },
        { code: "GFML", desc: "gluten free" },
        { code: "SFML", desc: "seafood" },
        { code: "DBML", desc: "diabetic-friendly" },
      ],
      on: ["AVML"],
      note: "...I will scan flights 24x7 and get you the best deals",
    },
    {
      label: "ALLERGIES",
      chips: [
        "Vegetarian",
        "Vegetarian Jain",
        "Non-veg",
        "Non-veg Halal",
        "Any veg",
        "Any non-veg",
      ],
      note: "...I’ll flag these to the airlines",
    },
    {
      label: "FLYING HOURS",
      done: true,
      value: "10 hrs max",
      note: "...basis previous 3 flights, 6 emails",
    },
    {
      label: "FLIGHT TIMINGS",
      done: true,
      chips: [
        "Early morning",
        "Morning",
        "Afternoon",
        "Evening",
        "Night",
        "Late night",
      ],
      on: ["Morning"],
      note: "...basis previous 3 flights, 6 emails",
    },
    {
      label: "STOPS",
      done: true,
      chips: ["Non-stop", "1-stop", "> 1 stop", "Cheapest"],
      on: ["Non-stop"],
      note: "...I will look for cheapest flights with a maximum of 1 stop",
    },
  ],
};


/* Stay — 853:64159. Its section notes are copy-pasted from the flight
 * sheet in the design file ("scan flights 24x7" under PREFERRED HOTELS),
 * reproduced as-is. */
export const STAY_AGENT: AgentSpec = {
  eyebrow: "STAY AGENT",
  headline: "Found 6/8 stay preferences",
  body: "You’ve flown Emirates to Dubai three times in the past year, and you’ve chosen an aisle seat every time.",
  sources: "3 Sources",
  sections: [
    {
      label: "PREFERRED HOTELS",
      done: true,
      chips: ["Taj", "Marriott", "+ Add"],
      on: ["Taj"],
      note: "...I will scan flights 24x7 and get you the best deals",
    },
    {
      label: "PROPERTY TYPE",
      done: true,
      chips: [
        "Hotel",
        "Boutique hotel",
        "Resort",
        "Serviced apartment",
        "Hostel",
        "Homestay",
        "Close to the city center",
      ],
      on: ["Hotel"],
      note: "...I will scan flights 24x7 and get you the best deals",
    },
    {
      label: "ROOMS",
      done: true,
      chips: [
        "High floor",
        "Low floor",
        "Quiet room",
        "King bed",
        "Twin beds",
        "Non-smoking",
      ],
      on: ["High floor", "King bed"],
      note: "...I will scan flights 24x7 and get you the best deals",
    },
    {
      label: "MUST HAVE AMENITIES",
      chips: [
        "Fast Wifi",
        "Breakfast",
        "Gym",
        "Swimming pool",
        "Spa",
        "Kitchen",
        "Laundry",
        "Kids play area",
      ],
      on: ["Fast Wifi", "Breakfast"],
      note: "...I will look for the cheapest window seat, if not available i’ll find the cheapest one",
    },
  ],
};

/* Medical — 853:64710. Opens on the dark ID card (853:65145), which is a
 * card in its own right rather than a list of rows: it carries the name,
 * the caduceus, and the lock-screen toggle inside itself. */
export const MEDICAL_AGENT: AgentSpec = {
  eyebrow: "MEDICAL AGENT",
  headline: "Found 6/8 medical preferences",
  body: "I’ve pulled together what matters, so you don’t have to piece it all together yourself.",
  sources: "3 Sources",
  sections: [
    {
      /* No heading in the design — the card names itself. */
      label: "MEDICAL CARD",
      toggle: "Open medical card when phone is locked",
      /* No NAME row — the card already carries the name as its heading
         (853:65156), so listing it again just repeated it. Figma's rows
         start at D.O.B. */
      fields: [
        { label: "D.O.B", value: "29.09.1993" },
        { label: "BLOOD GROUP", value: "O+" },
        { label: "EMERGENCY CONTACT", value: "+91 9834512458" },
        { label: "ORGAN DONOR", value: "YES" },
      ],
    },
    {
      label: "BLOOD TYPE",
      done: true,
      chips: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      on: ["O+"],
    },
    {
      label: "ALLERGIES",
      chips: [
        "Peanuts",
        "Shellfish",
        "Tree nuts",
        "Dairy",
        "Gluten",
        "Latex",
        "Penicillin",
        "+ Add",
      ],
      note: "...I’ll flag these to the airlines",
    },
    { label: "HEIGHT", done: true, value: "6 ft. (183cm)", chips: ["Rather not say"] },
    { label: "WEIGHT", chips: ["Rather not say"] },
    {
      label: "CONDITIONS",
      chips: [
        "Type 1 diabetes",
        "Type 2 diabetes",
        "Asthma",
        "Epilepsy",
        "Heart condition",
        "High blood pressure",
        "Pregnancy",
        "Recent surgeries",
      ],
    },
    {
      label: "ASSISTANCE NEEDED",
      chips: [
        "Own wheelchair",
        "Wheelchair to gate (Airport)",
        "Visual assistance (blind)",
        "hearing assistance (deaf)",
        "Service animal",
      ],
    },
  ],
};

/* Itinerary — 853:65455. */
export const ITINERARY_AGENT: AgentSpec = {
  eyebrow: "ITINERARY AGENT",
  headline: "Found 6/8 itinerary preferences",
  body: "I’ve pulled together what matters, so you don’t have to piece it all together yourself.",
  sources: "3 Sources",
  sections: [
    {
      label: "ACTIVITIES",
      done: true,
      chips: [
        "Food",
        "History",
        "Nature",
        "Nightlife",
        "Shopping",
        "Wellness",
        "Adventures",
        "Art",
        "Photography",
        "Sports",
        "Museums",
      ],
      on: ["Food", "Nature"],
    },
    {
      label: "GETTING AROUND",
      done: true,
      chips: [
        "Public transport",
        "Private",
        "Self-drive",
        "Prefer walking short distances",
        "Most efficient",
      ],
      on: ["Private"],
    },
    {
      label: "TRIP PACING",
      done: true,
      chips: ["Relaxed", "Balanced", "Packed"],
      on: ["Balanced"],
    },
  ],
};

/* Food — 853:65987. "Pescatarian", "DINING STYLE", "Fine dine" and
 * "Vistual assistance" are Figma's spellings, kept verbatim. */
export const FOOD_AGENT: AgentSpec = {
  eyebrow: "FOOD AGENT",
  headline: "Found 6/8 food preferences",
  body: "I’ve pulled together what matters, so you don’t have to piece it all together yourself.",
  sources: "3 Sources",
  sections: [
    {
      label: "DIETARY STYLE",
      done: true,
      chips: [
        "Vegan",
        "Pescatarian",
        "Jain",
        "Halal",
        "Kosher",
        "Gluten-free",
        "Keto",
        "+Add",
      ],
      on: ["Jain"],
    },
    {
      label: "ALLERGIES",
      chips: ["Peanuts", "Shellfish", "Tree nuts", "Dairy", "Gluten"],
      note: "...I’ll flag these to the airlines",
    },
    {
      label: "SPICE LEVELS",
      done: true,
      chips: ["sober", "Medium spicy", "super spicy"],
      on: ["Medium spicy"],
    },
    {
      label: "CUISINES YOU LOVE",
      done: true,
      chips: [
        "Indian",
        "Japanese",
        "Thai",
        "Italian",
        "Mediterranean",
        "Mexican",
        "Middle Eastern",
        "French",
        "+ Add",
      ],
      on: ["Indian", "Japanese"],
    },
    {
      label: "DISLIKES",
      chips: [
        "Seafood",
        "eggs",
        "Red meat - beef",
        "Red meat - pork",
        "Onion & Garlic",
      ],
    },
    {
      label: "DRINKS",
      chips: [
        "Wine",
        "Beer",
        "Spirits",
        "Non-alcoholic",
        "Sugar free",
        "Coffee",
        "Tea",
      ],
      on: ["Coffee"],
    },
    {
      label: "DINING STYLE",
      chips: [
        "Room service",
        "Buffet",
        "À la carte",
        "Quiet table",
        "Window table",
        "Early dining",
        "Late dining",
        "healthy",
        "Fine dine",
        "Street food",
      ],
    },
    {
      label: "OPEN TO TRYING OUT FOOD",
      done: true,
      chips: ["safe", "Open to trying", "experimental"],
      on: ["Open to trying"],
    },
  ],
};

/** Keyed by the Travel preferences tile. Airport logistics is deliberately
 *  absent — it opens the onboarding supercar sequence, not a preference
 *  sheet, so ProfileScreen routes it separately. */
export const AGENT_SPECS: Record<string, AgentSpec | undefined> = {
  flight: FLIGHT_AGENT,
  stay: STAY_AGENT,
  medical: MEDICAL_AGENT,
  itinerary: ITINERARY_AGENT,
  food: FOOD_AGENT,
};
