import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Начинаем seed...');

  // Только создаём ADMIN сотрудника (если ещё не существует)
  const existingAdmin = await prisma.employee.findUnique({
    where: { email: 'admin@pandoroom.local' },
  });

  if (existingAdmin) {
    console.log('ℹ️  Администратор уже существует:', existingAdmin.email);
  } else {
    const adminPassword = await bcrypt.hash('Admin12345!', 10);
    await prisma.employee.create({
      data: {
        email: 'admin@pandoroom.local',
        passwordHash: adminPassword,
        fullName: 'Администратор',
        phone: '+7 (999) 999-99-99',
        position: 'Главный администратор',
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log('✅ Создан администратор: admin@pandoroom.local');
  }

  console.log('🎉 Seed завершен!');
  console.log('');
  console.log('📧 Данные для входа:');
  console.log('   Email: admin@pandoroom.local');
  console.log('   Password: Admin12345!');
  console.log('');
  console.log('⚠️  Контент (квесты, новости, отзывы и т.д.) создаётся через админку.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
