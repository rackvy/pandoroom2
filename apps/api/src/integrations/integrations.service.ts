import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  INTEGRATIONS,
  findGroup,
  isMaskedValue,
  maskSecret,
  type IntegrationGroupView,
  type IntegrationProviderId,
} from './integration-catalog';

@Injectable()
export class IntegrationsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Действующие значения полей группы: сначала то, что заведено в админке,
   * иначе переменная окружения из описания поля.
   */
  async values(
    provider: IntegrationProviderId,
  ): Promise<Partial<Record<string, string>>> {
    const group = findGroup(provider);
    const rows = await this.prisma.integrationSetting.findMany({
      where: { provider: group.provider },
    });
    const byKey = new Map(rows.map((r) => [r.key, r.value]));

    const out: Partial<Record<string, string>> = {};
    for (const field of group.fields) {
      const fromDb = (byKey.get(field.key) || '').trim();
      if (fromDb) {
        out[field.key] = fromDb;
        continue;
      }
      const fromEnv = field.env
        ? (this.configService.get<string>(field.env) || '').trim()
        : '';
      if (fromEnv) out[field.key] = fromEnv;
    }
    return out;
  }

  async describe(): Promise<IntegrationGroupView[]> {
    const rows = await this.prisma.integrationSetting.findMany();
    const byKey = new Map(rows.map((r) => [`${r.provider}:${r.key}`, r.value]));

    return INTEGRATIONS.map((group) => ({
      provider: group.provider,
      label: group.label,
      note: group.note,
      fields: group.fields.map((field) => {
        const fromDb = (byKey.get(`${group.provider}:${field.key}`) || '').trim();
        const fromEnv = field.env
          ? (this.configService.get<string>(field.env) || '').trim()
          : '';
        const effective = fromDb || fromEnv;

        return {
          key: field.key,
          label: field.label,
          type: field.type || 'text',
          hint: field.hint,
          isSecret: !!field.secret,
          source: fromDb ? 'db' : fromEnv ? 'env' : 'none',
          value: field.secret ? maskSecret(effective) : effective,
          secretLength: field.secret && effective ? effective.length : null,
        };
      }),
    }));
  }

  /** Пустое значение очищает запись в БД и возвращает поле на env-источник. */
  async update(
    provider: string,
    incoming: Record<string, unknown>,
  ): Promise<IntegrationGroupView> {
    const group = findGroup(provider);

    for (const [key, raw] of Object.entries(incoming)) {
      const def = group.fields.find((f) => f.key === key);
      if (!def) {
        throw new BadRequestException(`Неизвестное поле ${provider}.${key}`);
      }
      if (raw !== null && raw !== undefined && typeof raw !== 'string') {
        throw new BadRequestException(`Поле ${provider}.${key} должно быть строкой`);
      }

      const value = (raw ?? '').trim();
      if (def.secret && isMaskedValue(value)) continue;

      if (!value) {
        await this.prisma.integrationSetting.deleteMany({
          where: { provider: group.provider, key },
        });
        continue;
      }

      await this.prisma.integrationSetting.upsert({
        where: { provider_key: { provider: group.provider, key } },
        create: { provider: group.provider, key, value, isSecret: !!def.secret },
        update: { value, isSecret: !!def.secret },
      });
    }

    const groups = await this.describe();
    return groups.find((g) => g.provider === group.provider)!;
  }
}
