-- Seed test players and matches for BO2 Xbox and BO2 PS3
-- Using existing leaderboard IDs

DO $$
DECLARE
  -- Existing leaderboard IDs
  xbox_lb_id UUID := 'b49f06ab-7431-408e-9425-416d6ff27cd3';
  ps3_lb_id UUID := 'fcc98ea6-5fc9-4f6b-913b-663b4e66d664';

  -- Xbox players
  wubzei_id UUID;
  relxa_id UUID;
  oxentary_id UUID;
  zapsi_id UUID;
  steroiz_id UUID;
  scrubzei_id UUID;
  nuketown_id UUID;
  yelicate_id UUID;
  flashxng_id UUID;
  berda_id UUID;

  -- PS3 only players
  hops_id UUID;
  vialect_id UUID;
  azi_id UUID;
  daeson_id UUID;
  sparkzei_id UUID;
  titxnium_id UUID;
  biosity_id UUID;
  fearmytalent_id UUID;

BEGIN
  -- Create all unique users (some appear on both leaderboards)

  -- Xbox players
  INSERT INTO users (id, username, "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), 'Wubzei', NOW(), NOW())
  ON CONFLICT (username) DO NOTHING;
  SELECT id INTO wubzei_id FROM users WHERE username = 'Wubzei';

  INSERT INTO users (id, username, "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), 'Relxa', NOW(), NOW())
  ON CONFLICT (username) DO NOTHING;
  SELECT id INTO relxa_id FROM users WHERE username = 'Relxa';

  INSERT INTO users (id, username, "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), 'Oxentary', NOW(), NOW())
  ON CONFLICT (username) DO NOTHING;
  SELECT id INTO oxentary_id FROM users WHERE username = 'Oxentary';

  INSERT INTO users (id, username, "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), 'Zapsi', NOW(), NOW())
  ON CONFLICT (username) DO NOTHING;
  SELECT id INTO zapsi_id FROM users WHERE username = 'Zapsi';

  INSERT INTO users (id, username, "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), 'Steroiz', NOW(), NOW())
  ON CONFLICT (username) DO NOTHING;
  SELECT id INTO steroiz_id FROM users WHERE username = 'Steroiz';

  INSERT INTO users (id, username, "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), 'Scrubzei', NOW(), NOW())
  ON CONFLICT (username) DO NOTHING;
  SELECT id INTO scrubzei_id FROM users WHERE username = 'Scrubzei';

  INSERT INTO users (id, username, "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), 'Nuketown Traps', NOW(), NOW())
  ON CONFLICT (username) DO NOTHING;
  SELECT id INTO nuketown_id FROM users WHERE username = 'Nuketown Traps';

  INSERT INTO users (id, username, "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), 'Yelicate', NOW(), NOW())
  ON CONFLICT (username) DO NOTHING;
  SELECT id INTO yelicate_id FROM users WHERE username = 'Yelicate';

  INSERT INTO users (id, username, "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), 'Flashxng', NOW(), NOW())
  ON CONFLICT (username) DO NOTHING;
  SELECT id INTO flashxng_id FROM users WHERE username = 'Flashxng';

  INSERT INTO users (id, username, "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), 'Im Berda', NOW(), NOW())
  ON CONFLICT (username) DO NOTHING;
  SELECT id INTO berda_id FROM users WHERE username = 'Im Berda';

  -- PS3 only players
  INSERT INTO users (id, username, "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), 'Hops', NOW(), NOW())
  ON CONFLICT (username) DO NOTHING;
  SELECT id INTO hops_id FROM users WHERE username = 'Hops';

  INSERT INTO users (id, username, "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), 'Vialect', NOW(), NOW())
  ON CONFLICT (username) DO NOTHING;
  SELECT id INTO vialect_id FROM users WHERE username = 'Vialect';

  INSERT INTO users (id, username, "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), 'Azi', NOW(), NOW())
  ON CONFLICT (username) DO NOTHING;
  SELECT id INTO azi_id FROM users WHERE username = 'Azi';

  INSERT INTO users (id, username, "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), 'Daeson', NOW(), NOW())
  ON CONFLICT (username) DO NOTHING;
  SELECT id INTO daeson_id FROM users WHERE username = 'Daeson';

  INSERT INTO users (id, username, "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), 'Sparkzei', NOW(), NOW())
  ON CONFLICT (username) DO NOTHING;
  SELECT id INTO sparkzei_id FROM users WHERE username = 'Sparkzei';

  INSERT INTO users (id, username, "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), 'Titxnium', NOW(), NOW())
  ON CONFLICT (username) DO NOTHING;
  SELECT id INTO titxnium_id FROM users WHERE username = 'Titxnium';

  INSERT INTO users (id, username, "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), 'Biosity', NOW(), NOW())
  ON CONFLICT (username) DO NOTHING;
  SELECT id INTO biosity_id FROM users WHERE username = 'Biosity';

  INSERT INTO users (id, username, "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), 'FearMyTalent', NOW(), NOW())
  ON CONFLICT (username) DO NOTHING;
  SELECT id INTO fearmytalent_id FROM users WHERE username = 'FearMyTalent';

  RAISE NOTICE 'Users created. IDs: wubzei=%, oxentary=%, flashxng=%', wubzei_id, oxentary_id, flashxng_id;

  -- Create Xbox leaderboard entries with wins/losses to establish rankings
  INSERT INTO leaderboard_entries (id, "userId", "leaderboardId", xp, "rankScore", wins, losses, "createdAt", "updatedAt")
  VALUES
    (gen_random_uuid(), wubzei_id, xbox_lb_id, 2500, 1450, 25, 5, NOW(), NOW()),
    (gen_random_uuid(), relxa_id, xbox_lb_id, 2200, 1380, 22, 8, NOW(), NOW()),
    (gen_random_uuid(), oxentary_id, xbox_lb_id, 2000, 1320, 20, 10, NOW(), NOW()),
    (gen_random_uuid(), zapsi_id, xbox_lb_id, 1800, 1260, 18, 12, NOW(), NOW()),
    (gen_random_uuid(), steroiz_id, xbox_lb_id, 1600, 1200, 16, 14, NOW(), NOW()),
    (gen_random_uuid(), scrubzei_id, xbox_lb_id, 1400, 1140, 14, 16, NOW(), NOW()),
    (gen_random_uuid(), nuketown_id, xbox_lb_id, 1200, 1080, 12, 18, NOW(), NOW()),
    (gen_random_uuid(), yelicate_id, xbox_lb_id, 1000, 1020, 10, 20, NOW(), NOW()),
    (gen_random_uuid(), flashxng_id, xbox_lb_id, 800, 960, 8, 22, NOW(), NOW()),
    (gen_random_uuid(), berda_id, xbox_lb_id, 600, 900, 6, 24, NOW(), NOW())
  ON CONFLICT ("userId", "leaderboardId") DO UPDATE SET
    xp = EXCLUDED.xp,
    "rankScore" = EXCLUDED."rankScore",
    wins = EXCLUDED.wins,
    losses = EXCLUDED.losses,
    "updatedAt" = NOW();

  RAISE NOTICE 'Xbox leaderboard entries created';

  -- Create PS3 leaderboard entries
  INSERT INTO leaderboard_entries (id, "userId", "leaderboardId", xp, "rankScore", wins, losses, "createdAt", "updatedAt")
  VALUES
    (gen_random_uuid(), hops_id, ps3_lb_id, 2400, 1440, 24, 6, NOW(), NOW()),
    (gen_random_uuid(), oxentary_id, ps3_lb_id, 2100, 1360, 21, 9, NOW(), NOW()),
    (gen_random_uuid(), vialect_id, ps3_lb_id, 1900, 1300, 19, 11, NOW(), NOW()),
    (gen_random_uuid(), azi_id, ps3_lb_id, 1700, 1240, 17, 13, NOW(), NOW()),
    (gen_random_uuid(), daeson_id, ps3_lb_id, 1500, 1180, 15, 15, NOW(), NOW()),
    (gen_random_uuid(), flashxng_id, ps3_lb_id, 1300, 1120, 13, 17, NOW(), NOW()),
    (gen_random_uuid(), sparkzei_id, ps3_lb_id, 1100, 1060, 11, 19, NOW(), NOW()),
    (gen_random_uuid(), titxnium_id, ps3_lb_id, 900, 1000, 9, 21, NOW(), NOW()),
    (gen_random_uuid(), biosity_id, ps3_lb_id, 700, 940, 7, 23, NOW(), NOW()),
    (gen_random_uuid(), fearmytalent_id, ps3_lb_id, 500, 880, 5, 25, NOW(), NOW())
  ON CONFLICT ("userId", "leaderboardId") DO UPDATE SET
    xp = EXCLUDED.xp,
    "rankScore" = EXCLUDED."rankScore",
    wins = EXCLUDED.wins,
    losses = EXCLUDED.losses,
    "updatedAt" = NOW();

  RAISE NOTICE 'PS3 leaderboard entries created';

  -- Create some completed matches for Xbox
  INSERT INTO matches (id, "challengerId", "challengeeId", "leaderboardId", type, status, "bestOf", "selectedMaps", "winnerId", "createdAt", "updatedAt")
  VALUES
    (gen_random_uuid(), wubzei_id, relxa_id, xbox_lb_id, 'RANKED', 'COMPLETED', 3, '["Raid", "Standoff", "Slums"]', wubzei_id, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
    (gen_random_uuid(), wubzei_id, oxentary_id, xbox_lb_id, 'RANKED', 'COMPLETED', 3, '["Raid", "Hijacked", "Standoff"]', wubzei_id, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
    (gen_random_uuid(), relxa_id, oxentary_id, xbox_lb_id, 'RANKED', 'COMPLETED', 3, '["Slums", "Raid", "Yemen"]', relxa_id, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
    (gen_random_uuid(), wubzei_id, zapsi_id, xbox_lb_id, 'RANKED', 'COMPLETED', 3, '["Standoff", "Raid", "Meltdown"]', wubzei_id, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
    (gen_random_uuid(), relxa_id, steroiz_id, xbox_lb_id, 'RANKED', 'COMPLETED', 3, '["Raid", "Slums", "Hijacked"]', relxa_id, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
    (gen_random_uuid(), oxentary_id, scrubzei_id, xbox_lb_id, 'RANKED', 'COMPLETED', 3, '["Yemen", "Raid", "Standoff"]', oxentary_id, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
    (gen_random_uuid(), zapsi_id, nuketown_id, xbox_lb_id, 'RANKED', 'COMPLETED', 3, '["Raid", "Standoff", "Slums"]', zapsi_id, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
    (gen_random_uuid(), steroiz_id, yelicate_id, xbox_lb_id, 'RANKED', 'COMPLETED', 3, '["Raid", "Standoff", "Hijacked"]', steroiz_id, NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours'),
    (gen_random_uuid(), scrubzei_id, flashxng_id, xbox_lb_id, 'RANKED', 'COMPLETED', 3, '["Slums", "Raid", "Yemen"]', scrubzei_id, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'),
    (gen_random_uuid(), nuketown_id, berda_id, xbox_lb_id, 'RANKED', 'COMPLETED', 3, '["Raid", "Standoff", "Meltdown"]', nuketown_id, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours');

  RAISE NOTICE 'Xbox matches created';

  -- Create some completed matches for PS3
  INSERT INTO matches (id, "challengerId", "challengeeId", "leaderboardId", type, status, "bestOf", "selectedMaps", "winnerId", "createdAt", "updatedAt")
  VALUES
    (gen_random_uuid(), hops_id, oxentary_id, ps3_lb_id, 'RANKED', 'COMPLETED', 3, '["Raid", "Standoff", "Slums"]', hops_id, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
    (gen_random_uuid(), hops_id, vialect_id, ps3_lb_id, 'RANKED', 'COMPLETED', 3, '["Raid", "Hijacked", "Standoff"]', hops_id, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
    (gen_random_uuid(), oxentary_id, vialect_id, ps3_lb_id, 'RANKED', 'COMPLETED', 3, '["Slums", "Raid", "Yemen"]', oxentary_id, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
    (gen_random_uuid(), hops_id, azi_id, ps3_lb_id, 'RANKED', 'COMPLETED', 3, '["Standoff", "Raid", "Meltdown"]', hops_id, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
    (gen_random_uuid(), oxentary_id, daeson_id, ps3_lb_id, 'RANKED', 'COMPLETED', 3, '["Raid", "Slums", "Hijacked"]', oxentary_id, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
    (gen_random_uuid(), vialect_id, flashxng_id, ps3_lb_id, 'RANKED', 'COMPLETED', 3, '["Yemen", "Raid", "Standoff"]', vialect_id, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
    (gen_random_uuid(), azi_id, sparkzei_id, ps3_lb_id, 'RANKED', 'COMPLETED', 3, '["Raid", "Slums", "Hijacked"]', azi_id, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
    (gen_random_uuid(), daeson_id, titxnium_id, ps3_lb_id, 'RANKED', 'COMPLETED', 3, '["Raid", "Standoff", "Hijacked"]', daeson_id, NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours'),
    (gen_random_uuid(), flashxng_id, biosity_id, ps3_lb_id, 'RANKED', 'COMPLETED', 3, '["Slums", "Raid", "Yemen"]', flashxng_id, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'),
    (gen_random_uuid(), sparkzei_id, fearmytalent_id, ps3_lb_id, 'RANKED', 'COMPLETED', 3, '["Raid", "Meltdown", "Standoff"]', sparkzei_id, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours');

  RAISE NOTICE 'PS3 matches created';
  RAISE NOTICE 'Test data seeded successfully!';
END $$;
