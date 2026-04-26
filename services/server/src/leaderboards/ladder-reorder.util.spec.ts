import { rankScoreForLadderRank, reorderRankedUserIdsAfterUpset } from './ladder-reorder.util';

describe('reorderRankedUserIdsAfterUpset', () => {
  const tenPlayers = [
    'Wubzei',
    'Relxa',
    'Oxentary',
    'Zapsi',
    'Scrubzei',
    'Steroiz',
    'NuketownTraps',
    'Yelicate',
    'WetVideos',
    'ImBerda',
  ];

  it('Example 1: #10 beats #1 — winner to top, former 1–9 shift down', () => {
    const out = reorderRankedUserIdsAfterUpset(tenPlayers, 'ImBerda', 'Wubzei');
    expect(out).toEqual([
      'ImBerda',
      'Wubzei',
      'Relxa',
      'Oxentary',
      'Zapsi',
      'Scrubzei',
      'Steroiz',
      'NuketownTraps',
      'Yelicate',
      'WetVideos',
    ]);
  });

  it('Example 2: #8 beats #2 — winner to index 1, between shift', () => {
    const out = reorderRankedUserIdsAfterUpset(tenPlayers, 'Yelicate', 'Relxa');
    expect(out).toEqual([
      'Wubzei',
      'Yelicate',
      'Relxa',
      'Oxentary',
      'Zapsi',
      'Scrubzei',
      'Steroiz',
      'NuketownTraps',
      'WetVideos',
      'ImBerda',
    ]);
  });

  it('favorite win (#1 beats #10): no reorder', () => {
    expect(reorderRankedUserIdsAfterUpset(tenPlayers, 'Wubzei', 'ImBerda')).toBeNull();
  });

  it('favorite win (#2 beats #10): no reorder', () => {
    expect(reorderRankedUserIdsAfterUpset(tenPlayers, 'Relxa', 'ImBerda')).toBeNull();
  });

  it('adjacent upset #3 beats #2', () => {
    const small = ['A', 'B', 'C', 'D'];
    expect(reorderRankedUserIdsAfterUpset(small, 'C', 'B')).toEqual(['A', 'C', 'B', 'D']);
  });
});

describe('rankScoreForLadderRank', () => {
  it('matches updateRanks formula', () => {
    expect(rankScoreForLadderRank(1)).toBe(100000);
    expect(rankScoreForLadderRank(2)).toBe(99000);
    expect(rankScoreForLadderRank(10)).toBe(91000);
  });
});
