# Show HN: Prakruti — multi-model weather blend with a confidence score for 45 Indian cities

**URL to submit:** https://prakruti-ten.vercel.app  
**Submit at:** https://news.ycombinator.com/submit  
**Best time:** Tuesday–Thursday, 9–11 AM EST (when the US wakes up, AU/EU still up)

---

## Title (60 chars max, HN counts)

```
Show HN: Blending 4 weather models into one forecast for 45 Indian cities
```

or

```
Show HN: Prakruti – multi-model weather blend with a 0-100% confidence score
```

---

## Body (paste into the "text" field — optional but worth it)

```
India gets four global NWP forecasts — ECMWF, GFS, ICON, GEM — that
often disagree by 5–10°C or 20+ mm of rain for the same city. Prakruti
picks the most accurate model for each city on each day (based on 61 days
of ERA5 verification), blends them with inverse-RMSE weighting, and shows
a single number (0–100%) that says how confident the consensus is.

It's built as the backend for Smart India Hackathon 2026 (PS-26081,
Ministry of Earth Sciences). The full pipeline — fetch → verify against
ERA5 → weight → blend → calibrate with Random Forests → confidence engine
→ Flask API → Next.js dashboard — is open source.

Live: https://prakruti-ten.vercel.app
Repo: https://github.com/imstillashish/Prakruti

Happy to answer questions about the blending math or the confidence formula.
```

---

## Tips

- Don't include "open source" in the title (HN readers assume it if you link a GH repo)
- If it picks up traction, reply to every comment in the first 2 hours — that's what keeps it on the front page
- Pin the discussion tab link in your first comment so people can continue the conversation
- Cross-post to r/MachineLearning, r/Python, and r/india after HN (not before — HN hates cross-posts)
