import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * 可选云端 Prisma 客户端 ——「惰性单例」。
 *
 * 关键：**模块加载时绝不构造** PrismaClient。
 * Prisma 7 要求带 driver adapter 构造，未配 DATABASE_URL 时 `new PrismaClient()`
 * 会抛 PrismaClientInitializationError；而 Next.js 构建会 import 每个 route 模块，
 * 一旦在模块顶层 eager 构造，纯本地（无 DB）部署在 build「collect page data」阶段就崩。
 *
 * 因此用 Proxy 惰性化：只有真正访问 `prisma.xxx` 时才构造，且必须有 DATABASE_URL。
 * 纯本地模式下所有 API 路由都以 `DATABASE_URL` 门控、提前返回，根本不会触达这里。
 */

const connectionString = process.env.DATABASE_URL;

let client: PrismaClient | null = null;

function getClient(): PrismaClient {
  if (client) return client;
  if (!connectionString) {
    // 纯本地模式不应走到这里（路由已用 DATABASE_URL 门控）；真触达则给清晰错误
    throw new Error(
      'DATABASE_URL 未配置：云端同步未启用。论文库为纯本地 Dexie 单一真相源，无需数据库。',
    );
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  client = new PrismaClient({ adapter });
  return client;
}

/** 惰性代理：模块加载零构造；首次属性访问才按需创建真实客户端。 */
const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const value = (getClient() as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function'
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
});

export default prisma;
export { prisma };
