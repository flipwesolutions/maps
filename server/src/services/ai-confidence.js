/**
 * AI confidence scoring for submissions (Layer 7).
 * Rule-based foundation — extensible to ML models.
 */
export function scoreSubmission({ submissionType, payload, gps }) {
  let score = 0.4;
  const flags = [];

  if (gps?.lat && gps?.lng) {
    score += 0.15;
    if (gps.accuracy_m && gps.accuracy_m < 30) {
      score += 0.15;
      flags.push("high_gps_accuracy");
    } else if (gps.accuracy_m && gps.accuracy_m < 100) {
      score += 0.08;
    }
  } else {
    flags.push("missing_gps");
    score -= 0.1;
  }

  if (payload?.name?.length >= 3) score += 0.1;
  if (payload?.address?.street) score += 0.08;
  if (payload?.photos?.length > 0) score += 0.05;
  if (payload?.gst_number) score += 0.1;

  if (submissionType === "business" && payload?.phone) score += 0.05;

  score = Math.max(0, Math.min(1, score));

  if (score >= 0.85) flags.push("auto_review_candidate");
  if (score < 0.5) flags.push("requires_admin_review");

  return { score, flags };
}

/** Aggregate GPS visits to suggest new places */
export function scoreGpsCluster({ visitCount, uniqueDrivers, gpsAccuracy }) {
  let score = Math.min(visitCount / 100, 0.5) + Math.min(uniqueDrivers / 50, 0.3);
  if (gpsAccuracy < 25) score += 0.1;
  return Math.min(1, score);
}
