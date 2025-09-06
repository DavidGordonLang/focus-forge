// Focus Forge — Suite Bridge (Phase 1)
// Same API shape as Echo version (JS). Focus can later call:
//   window.SUITE.getCurrentIntention() to prefill session/task name
//   window.SUITE.addTask({ title, estimate, source: "focus" })
//   window.SUITE.addTaskOutcome({ title, success, notes, duration, source: "focus" })

(function initSuiteBridge() {
  if (window.SUITE) return; // if Echo already loaded it, reuse
  // Reuse identical implementation:
  const BUS = {
    version: "v1",
    keys: {
      intentions: "suite.intentions",
      currentIntention: "suite.currentIntention",
      suggestedRitual: "suite.suggestedRitual",
      journals: "suite.journals",
      tasks: "suite.tasks",
      taskOutcomes: "suite.taskOutcomes",
      insights: "suite.insights",
    },
  };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return structuredClone(fallback);
      const parsed = JSON.parse(raw);
      return parsed ?? structuredClone(fallback);
    } catch {
      return structuredClone(fallback);
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify(value) }));
    } catch (e) {
      console.error("[SuiteBridge] write failed", key, e);
    }
  }

  function append(key, entry) {
    const list = read(key, []);
    list.push(entry);
    write(key, list);
  }

  window.SUITE = {
    BUS,
    addInsight(content, meta = {}) {
      append(BUS.keys.insights, {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        content,
        meta,
        source: "focus",
      });
    },
    setSuggestedRitual(ritualId, reason) {
      write(BUS.keys.suggestedRitual, {
        ritualId,
        reason,
        at: new Date().toISOString(),
        source: "focus",
      });
    },
    setCurrentIntention(text, meta = {}) {
      write(BUS.keys.currentIntention, {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        text,
        meta,
        source: meta.source || "focus",
      });
      append(BUS.keys.intentions, { at: new Date().toISOString(), text, meta, source: "focus" });
    },
    addJournal(entry) {
      append(BUS.keys.journals, { ...entry, id: crypto.randomUUID(), at: new Date().toISOString() });
    },
    addTask(task) {
      append(BUS.keys.tasks, { ...task, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    },
    addTaskOutcome(outcome) {
      append(BUS.keys.taskOutcomes, { ...outcome, id: crypto.randomUUID(), at: new Date().toISOString() });
    },
    getSuggestedRitual() {
      return read(BUS.keys.suggestedRitual, null);
    },
    getCurrentIntention() {
      return read(BUS.keys.currentIntention, null);
    },
  };
})();
