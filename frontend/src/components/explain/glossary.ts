// One entry per term shown with an info-bubble. Reviewed as prose by the team.
export type GlossaryEntry = { title: string; body: string };
// `satisfies` (not a Record annotation) keeps the keys as literals so the
// GlossaryKey union below comes out of the object itself.
export const glossary = {
  rmse: {
    title: "Average miss (RMSE)",
    body: "How far off a forecast model is on average, in real units (°C, mm, km/h). Smaller is better.",
  },
  uncertainty: {
    title: "Uncertainty (±)",
    body: "The range the real value is likely to fall in. Smaller means a sharper forecast.",
  },
  weight: {
    title: "Model influence",
    body: "How much say each forecast model has in the final answer. Models that have been more accurate for this city recently get more say.",
  },
  confidence: {
    title: "Confidence",
    body: "How sure the blended forecast is, from 0 to 100%. Based on past accuracy, agreement between the 4 models, and how far ahead the forecast is.",
  },
  rpi: {
    title: "Risk score (RPI)",
    body: "A 0–100 danger score combining rainfall, heat and wind so disaster agencies can rank where to act first.",
  },
  leadDay: {
    title: "Day-ahead labels",
    body: "D+1 means tomorrow, D+2 the day after, D+3 three days ahead. Accuracy is tracked separately for each.",
  },
  era5: {
    title: "ERA5 ground truth",
    body: "A trusted historical weather record used to check how accurate each model actually was.",
  },
  models: {
    title: "The 4 models",
    body: "ECMWF (Europe), GFS (USA), ICON (Germany) and GEM (Canada) — the world's leading weather prediction systems, blended into one answer.",
  },
  ensembleAgreement: {
    title: "Ensemble agreement",
    body: "How closely the 4 models agree with each other. High agreement usually means a more trustworthy forecast.",
  },
  nwp: {
    title: "NWP",
    body: "Numerical Weather Prediction — physics-based simulation of the atmosphere on supercomputers.",
  },
  skillScore: {
    title: "Skill score",
    body: "How much better (or worse) a model is than a basic average, in percent. Positive means it beats the baseline.",
  },
  calibration: {
    title: "Raw vs calibrated",
    body: "Raw numbers straight from the weather models, versus our corrected forecast. The correction layers first fix each model's known bias, then a machine-learning step clears what is left — the % figures come from days the correction never saw.",
  },
  coldStart: {
    title: "Why is it loading?",
    body: "The free server hosting the forecast engine goes to sleep when idle. Waking it can take up to a minute on first visit.",
  },
  station: {
    title: "Forecast station",
    body: "A city location with its own dedicated blended forecast — 45 across India.",
  },
} satisfies Record<string, GlossaryEntry>;

/** Every term <Explain term> / <Panel term> accepts — a typo is a type error. */
export type GlossaryKey = keyof typeof glossary;
