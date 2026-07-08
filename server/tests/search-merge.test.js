import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeSearchResults, scorePlace } from "../src/services/search-merge.js";
import { scoreSubmission } from "../src/services/ai-confidence.js";

describe("search-merge", () => {
  it("ranks verified places above OSM", () => {
    const osm = [
      {
        id: "osm-1",
        name: "Koramangala",
        subtitle: "Bengaluru",
        coordinates: [77.627, 12.935],
        layer: "osm",
        source: "osm",
      },
    ];
    const verified = [
      {
        id: "flipwi-1",
        name: "Koramangala 5th Block",
        subtitle: "Bengaluru, Karnataka",
        coordinates: [77.628, 12.936],
        layer: "flipwi_verified",
        source: "flipwi_verified",
        verification_status: "approved",
        confidence_score: 0.95,
      },
    ];

    const merged = mergeSearchResults([verified, osm], {
      proximity: [77.627, 12.935],
      limit: 5,
    });

    assert.equal(merged[0].id, "flipwi-1");
    assert.ok(merged[0].rank_score > merged[1].rank_score);
  });

  it("deduplicates same coordinates", () => {
    const a = [
      {
        id: "a",
        name: "Test",
        subtitle: "X",
        coordinates: [77.6, 12.9],
        layer: "osm",
      },
      {
        id: "b",
        name: "Test",
        subtitle: "X",
        coordinates: [77.6, 12.9],
        layer: "flipwi_verified",
        verification_status: "approved",
        confidence_score: 0.9,
      },
    ];
    const merged = mergeSearchResults([a], { limit: 10 });
    assert.equal(merged.length, 1);
  });
});

describe("ai-confidence", () => {
  it("scores GPS submissions higher", () => {
    const withGps = scoreSubmission({
      submissionType: "place",
      payload: { name: "HSR Layout Gate" },
      gps: { lat: 12.9, lng: 77.6, accuracy_m: 15 },
    });
    const noGps = scoreSubmission({
      submissionType: "place",
      payload: { name: "HSR Layout Gate" },
    });
    assert.ok(withGps.score > noGps.score);
  });
});
