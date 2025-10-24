import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '5000', 10),
  env: process.env.NODE_ENV ?? 'development',
}));
