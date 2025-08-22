// Test setup file
require('dotenv').config({ path: '.env.test' });

// Mock Redis for tests
jest.mock('../src/config/redis', () => ({
  connectRedis: jest.fn(),
  getClient: jest.fn(() => ({
    setEx: jest.fn(),
    get: jest.fn(),
    del: jest.fn()
  })),
  closeConnection: jest.fn()
}));

// Mock external services
jest.mock('twilio', () => {
  return jest.fn().mockImplementation(() => ({
    calls: {
      create: jest.fn(),
      list: jest.fn()
    },
    messages: {
      create: jest.fn()
    },
    conferences: {
      create: jest.fn()
    }
  }));
});

// Setup test timeout
jest.setTimeout(10000);