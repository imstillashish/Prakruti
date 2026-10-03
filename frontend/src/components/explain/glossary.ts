// One entry per term shown with an info-bubble. Reviewed as prose by the team.
export type GlossaryEntry = { title: string; body: string };
// `satisfies` (not a Record annotation) keeps the keys as literals so the
// GlossaryKey union below comes out of the object itself.
export const glossary = {
  rmse: {
    title: "Average Forecast Error (RMSE)",
    body: "How far off the forecast typically is in real units (°C, mm, km/h). Smaller is better: think of it as hitting closer to the dartboard bullseye.",
  },
  uncertainty: {
    title: "Expected Range (±)",
    body: "The window where actual weather is likely to fall. A tighter range means a sharper, more focused forecast.",
  },
  weight: {
    title: "Model Influence",
    body: "How much say each supercomputer has in our final blended answer. Models that have performed best for your city get more say.",
  },
  confidence: {
    title: "Forecast Certainty",
    body: "How sure our system is (0–100%). When all 4 international models agree, certainty is high.",
  },
  rpi: {
    title: "Weather Danger Score (0–100)",
    body: "A combined hazard score factoring rain, heat, and wind so disaster agencies and citizens know when to take precautions.",
  },
  leadDay: {
    title: "Forecast Horizon (D+1, D+2, D+3)",
    body: "How many days ahead the forecast looks. D+1 is tomorrow, D+2 is two days ahead, and D+3 is three days ahead.",
  },
  era5: {
    title: "Verified Historical Weather (ERA5)",
    body: "A gold-standard weather archive combining satellite and station data, used as an answer key to check model accuracy.",
  },
  models: {
    title: "The 4 Supercomputers",
    body: "European ECMWF, American GFS, German ICON, and Canadian GEM, blended into one reliable answer.",
  },
  ensembleAgreement: {
    title: "Model Consensus",
    body: "How closely the 4 supercomputers agree with one another. When all 4 show similar numbers, the forecast is much more reliable.",
  },
  nwp: {
    title: "Atmospheric Simulation (NWP)",
    body: "Numerical Weather Prediction: physics-based atmospheric simulations calculated by international supercomputing centers.",
  },
  skillScore: {
    title: "Accuracy Advantage",
    body: "How much better the model performs compared to a basic historical average. Positive numbers mean beating the baseline.",
  },
  calibration: {
    title: "Raw vs Calibrated Forecast",
    body: "Raw forecasts straight from the supercomputers versus our localized corrections, adjusted for terrain and regional microclimates.",
  },
  coldStart: {
    title: "Waking Up the Engine",
    body: "The forecast server spins down when idle to conserve energy. Waking it back up takes 30 to 60 seconds on the first visit.",
  },
  station: {
    title: "City Forecast Station",
    body: "A specific weather tracking hub with its own tailored blend, covering 45 major cities across India.",
  },
} satisfies Record<string, GlossaryEntry>;

/** Every term <Explain term> / <Panel term> accepts — a typo is a type error. */
export type GlossaryKey = keyof typeof glossary;
