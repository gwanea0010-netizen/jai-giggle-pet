// Available pets. Shared by the main process (menus) and the renderers.
(function (root) {
  const SPECIES = [
    { id: 'cat', name: 'Giggles Cat', blurb: 'The original giggler' },
    { id: 'cyborgai', name: 'Cyborg AI', blurb: 'Official Cyborg ERP bot' },
    { id: 'robot', name: 'Cyborg Bot', blurb: 'Cyborg ERP edition' },
    { id: 'bunny', name: 'Bunny', blurb: 'Hops when happy' },
    { id: 'panda', name: 'Panda', blurb: 'Chill & cuddly' },
    { id: 'dino', name: 'Dino', blurb: 'Tiny but fierce' },
    { id: 'fox', name: 'Fox', blurb: 'Clever & quick' },
    { id: 'koala', name: 'Koala', blurb: 'Sleepy hugger' },
  ];
  if (typeof module !== 'undefined' && module.exports) module.exports = SPECIES;
  else root.PET_SPECIES = SPECIES;
})(typeof window !== 'undefined' ? window : globalThis);
