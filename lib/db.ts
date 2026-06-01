import { neon } from '@neondatabase/serverless';

export default function getSql() {
  return neon(process.env.DATABASE_URL!);
}
