// Badges. `value(ctx)` reads the counters the main process keeps; a badge unlocks at `goal`.
// ctx = { total, bestDay, streak, night, early, weekend, flings, snacks, pats, codeChecks, festivals, projectsToday }
(function (root) {
  const ACHIEVEMENTS = [
    { id: 'first_task', emoji: '🐣', name: 'First Steps', desc: 'Finish your first task', goal: 1, value: (c) => c.total },
    { id: 'tasks_10', emoji: '🔥', name: 'Getting Warm', desc: 'Finish 10 tasks', goal: 10, value: (c) => c.total },
    { id: 'tasks_50', emoji: '🏏', name: 'Half Century', desc: 'Finish 50 tasks', goal: 50, value: (c) => c.total },
    { id: 'tasks_100', emoji: '💯', name: 'Centurion', desc: 'Finish 100 tasks', goal: 100, value: (c) => c.total },
    { id: 'tasks_500', emoji: '🤖', name: 'Code Machine', desc: 'Finish 500 tasks', goal: 500, value: (c) => c.total },
    { id: 'day_10', emoji: '🐝', name: 'Busy Bee', desc: '10 tasks in one day', goal: 10, value: (c) => c.bestDay },
    { id: 'day_25', emoji: '🚀', name: 'On Fire', desc: '25 tasks in one day', goal: 25, value: (c) => c.bestDay },
    { id: 'streak_3', emoji: '🎩', name: 'Hat-trick', desc: 'Work 3 days in a row', goal: 3, value: (c) => c.streak },
    { id: 'streak_7', emoji: '📅', name: 'Week Warrior', desc: 'Work 7 days in a row', goal: 7, value: (c) => c.streak },
    { id: 'streak_30', emoji: '🏆', name: 'Unstoppable', desc: 'Work 30 days in a row', goal: 30, value: (c) => c.streak },
    { id: 'night_owl', emoji: '🦉', name: 'Night Owl', desc: '10 tasks after 10 PM', goal: 10, value: (c) => c.night },
    { id: 'early_bird', emoji: '🐦', name: 'Early Bird', desc: '10 tasks before 8 AM', goal: 10, value: (c) => c.early },
    { id: 'weekend', emoji: '⚔️', name: 'Weekend Warrior', desc: '5 tasks on weekends', goal: 5, value: (c) => c.weekend },
    { id: 'juggler', emoji: '🤹', name: 'Juggler', desc: 'Tasks in 3 projects in one day', goal: 3, value: (c) => c.projectsToday },
    { id: 'flyer', emoji: '🎯', name: 'Frequent Flyer', desc: 'Slingshot your pet 20 times', goal: 20, value: (c) => c.flings },
    { id: 'foodie', emoji: '🍪', name: 'Foodie', desc: 'Feed 10 snacks', goal: 10, value: (c) => c.snacks },
    { id: 'cuddles', emoji: '💕', name: 'Best Friends', desc: 'Pat your pet 25 times', goal: 25, value: (c) => c.pats },
    { id: 'guardian', emoji: '🔍', name: 'Query Guardian', desc: 'Get 25 code / SQL checks', goal: 25, value: (c) => c.codeChecks },
    { id: 'festive', emoji: '🪔', name: 'Festive Spirit', desc: 'Collect a festival outfit', goal: 1, value: (c) => c.festivals },
  ];

  function context(stats = {}, ach = {}, collected = []) {
    return {
      total: stats.total || 0,
      bestDay: Math.max(ach.bestDay || 0, stats.today || 0),
      streak: ach.streak || 0,
      night: ach.night || 0,
      early: ach.early || 0,
      weekend: ach.weekend || 0,
      flings: ach.flings || 0,
      snacks: ach.snacks || 0,
      pats: ach.pats || 0,
      codeChecks: ach.codeChecks || 0,
      // only festival outfits count (not accessories a teammate gifted)
      festivals: (collected || []).filter((id) => ['kurta', 'diya', 'holi', 'santa', 'gift', 'stars', 'flag'].includes(id)).length,
      projectsToday: (ach.projects || []).length,
    };
  }

  const unlocked = (ctx) => ACHIEVEMENTS.filter((a) => a.value(ctx) >= a.goal).map((a) => a.id);

  const api = { ACHIEVEMENTS, context, unlocked };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PET_ACHIEVEMENTS = api;
})(typeof window !== 'undefined' ? window : globalThis);
