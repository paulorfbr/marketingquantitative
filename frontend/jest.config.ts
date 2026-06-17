import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  coverageThreshold: {
    'src/lib/': {
      lines: 80,
      branches: 70,
    },
    'src/components/': {
      lines: 70,
    },
    global: {
      branches: 70,
    },
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/**/page.tsx',
    '!src/app/**/layout.tsx',
  ],
};

export default createJestConfig(config);
