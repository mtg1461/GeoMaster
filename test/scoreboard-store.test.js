const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync("lib/scoreboard-store.js", "utf8");

function loadStore(initialValue = null, { failWrites = false } = {}) {
  let value = initialValue;
  const localStorage = {
    getItem() {
      return value;
    },
    removeItem() {
      if (failWrites) throw new Error("storage unavailable");
      value = null;
    },
    setItem(_key, nextValue) {
      if (failWrites) throw new Error("storage unavailable");
      value = nextValue;
    },
  };
  const window = { GeoMaster: {}, localStorage };

  vm.runInNewContext(source, { window });
  return { getValue: () => value, store: window.GeoMaster.scoreboardStore };
}

test("ignores malformed persisted values and entries", () => {
  const persisted = JSON.stringify({
    "type-answer": [
      null,
      { difficulty: "easy", maxScore: 100, playedAt: "invalid", score: 50 },
      { difficulty: "expert", maxScore: 100, playedAt: "2026-01-01T00:00:00Z", score: 80 },
    ],
  });
  const { store } = loadStore(persisted);

  assert.deepEqual(
    JSON.parse(JSON.stringify(store.getTopScores("type-answer"))),
    [{ difficulty: "expert", maxScore: 100, playedAt: "2026-01-01T00:00:00.000Z", score: 80 }],
  );
});

test("migrates aliases, sorts results, and retains only five scores", () => {
  const legacy = Array.from({ length: 5 }, (_, index) => ({
    difficulty: "easy",
    maxScore: 100,
    playedAt: `2026-01-0${index + 1}T00:00:00Z`,
    score: index * 10,
  }));
  const context = loadStore(JSON.stringify({ "select-country": legacy }));

  context.store.addScore("multiple-choice", { difficulty: "hard", maxScore: 100, score: 75 });

  const saved = JSON.parse(context.getValue());
  assert.equal(saved["select-country"], undefined);
  assert.deepEqual(saved["multiple-choice"].map((entry) => entry.score), [75, 40, 30, 20, 10]);
});

test("continues when browser storage rejects writes and clears", () => {
  const { store } = loadStore(null, { failWrites: true });

  assert.doesNotThrow(() => store.addScore("type-answer", {
    difficulty: "normal",
    maxScore: 100,
    score: 50,
  }));
  assert.doesNotThrow(() => store.clearScores());
});

test("rejects invalid new scores", () => {
  const { store } = loadStore();

  assert.throws(
    () => store.addScore("type-answer", { difficulty: "unknown", maxScore: 100, score: 50 }),
    /invalid score/,
  );
});
