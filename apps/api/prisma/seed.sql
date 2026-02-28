-- Seed script for initial data
-- Password hash for 'Admin12345!' (bcrypt with 10 rounds)
-- You can generate this with: node -e "console.log(require('bcrypt').hashSync('Admin12345!', 10))"

-- Insert admin employee (replace $2b$10$... with actual hash)
INSERT INTO "Employee" (id, email, "passwordHash", "fullName", phone, position, role, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@pandoroom.local',
  '$2b$10$YourHashHere',  -- Replace with actual bcrypt hash
  'Администратор',
  '+7 (999) 999-99-99',
  'Главный администратор',
  'ADMIN',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Insert default branch
INSERT INTO "Branch" (id, name, "geoLat", "geoLng", phone, whatsapp, telegram, "sortOrder", "isActive", "createdAt", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Pandoroom Central',
  55.7558,
  37.6173,
  '+7 (495) 123-45-67',
  '+7 (495) 123-45-67',
  '@pandoroom',
  0,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
