// Wardrobe items. Regular items unlock by the all-time number of finished Claude tasks;
// festival items are collected by having the pet running during that festival.
// Shared by the main process (unlock logic) and the renderers.
(function (root) {
  const ACCESSORIES = [
    { id: 'nerd', slot: 'face', name: 'Nerd glasses', emoji: '🤓', unlock: 3 },
    { id: 'bowtie', slot: 'neck', name: 'Bow tie', emoji: '🎀', unlock: 8 },
    { id: 'tshirt', slot: 'body', name: 'Cyborg ERP tee', emoji: '👕', unlock: 12 },
    { id: 'partyhat', slot: 'head', name: 'Party hat', emoji: '🥳', unlock: 15 },
    { id: 'shades', slot: 'face', name: 'Cool shades', emoji: '😎', unlock: 25 },
    { id: 'flower', slot: 'head', name: 'Flower', emoji: '🌸', unlock: 35 },
    { id: 'cap', slot: 'head', name: 'Cyborg ERP cap', emoji: '🧢', unlock: 50 },
    { id: 'crown', slot: 'head', name: 'Crown', emoji: '👑', unlock: 75 },
    { id: 'cape', slot: 'neck', name: 'Hero cape', emoji: '🦸', unlock: 100 },

    // festival collectibles
    { id: 'kurta', slot: 'body', name: 'Festive kurta', emoji: '🧡', festival: 'diwali' },
    { id: 'diya', slot: 'prop', name: 'Diya', emoji: '🪔', festival: 'diwali' },
    { id: 'holi', slot: 'body', name: 'Holi colours', emoji: '🎨', festival: 'holi' },
    { id: 'santa', slot: 'head', name: 'Santa hat', emoji: '🎅', festival: 'christmas' },
    { id: 'gift', slot: 'prop', name: 'Gift box', emoji: '🎁', festival: 'christmas' },
    { id: 'stars', slot: 'face', name: 'Star glasses', emoji: '✨', festival: 'newyear' },
    { id: 'flag', slot: 'prop', name: 'Tiranga', emoji: '🇮🇳', festival: 'india' },
  ];

  const SLOTS = { head: 'Head', face: 'Face', body: 'Outfit', neck: 'Neck & back', prop: 'Props' };

  // `dates` are exact days (lunar festivals); `md` repeats every year (MM-DD).
  const FESTIVALS = [
    { id: 'diwali', name: 'Diwali', emoji: '🪔', greet: 'Happy Diwali', dates: ['2026-11-08', '2027-10-29', '2028-10-17', '2029-11-05'], before: 4, after: 3 },
    { id: 'holi', name: 'Holi', emoji: '🎨', greet: 'Happy Holi', dates: ['2026-03-04', '2027-03-22', '2028-03-11', '2029-03-01'], before: 2, after: 2 },
    { id: 'christmas', name: 'Christmas', emoji: '🎄', greet: 'Merry Christmas', md: ['12-25'], before: 6, after: 6 },
    { id: 'newyear', name: 'New Year', emoji: '🎆', greet: 'Happy New Year', md: ['01-01'], before: 1, after: 3 },
    { id: 'india', name: 'Independence & Republic Day', emoji: '🇮🇳', greet: 'Jai Hind', md: ['08-15', '01-26'], before: 1, after: 1 },
  ];

  const DAY = 24 * 60 * 60 * 1000;
  const ymd = (d) => d.toLocaleDateString('en-CA');

  // Festival active on `date` (local time), or null.
  function activeFestival(date = new Date()) {
    const today = new Date(ymd(date) + 'T00:00:00').getTime();
    for (const f of FESTIVALS) {
      const days = (f.dates || []).slice();
      for (const md of f.md || []) {
        const y = date.getFullYear();
        days.push(`${y - 1}-${md}`, `${y}-${md}`, `${y + 1}-${md}`);
      }
      for (const d of days) {
        const t = new Date(d + 'T00:00:00').getTime();
        if (today >= t - f.before * DAY && today <= t + f.after * DAY) return f;
      }
    }
    return null;
  }

  const isUnlocked = (item, total, collected = []) =>
    item.festival ? collected.includes(item.id) : total >= item.unlock;

  const api = { ACCESSORIES, SLOTS, FESTIVALS, activeFestival, isUnlocked };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PET_ACCESSORIES = api;
})(typeof window !== 'undefined' ? window : globalThis);
