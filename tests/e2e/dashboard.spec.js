const { test, expect } = require('@playwright/test');

// Helper function to authenticate
async function authenticate(page) {
  // Mock authentication endpoints
  await page.route('**/api/auth/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        userId: 'test-user-123',
        hubspotConnected: true
      })
    });
  });
  
  await page.route('**/api/auth/validate-token', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        valid: true,
        userId: 'test-user-123'
      })
    });
  });
  
  await page.route('**/api/calls/history', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        calls: [
          {
            id: 'call-1',
            toNumber: '+1234567890',
            status: 'completed',
            duration: 120,
            createdAt: new Date().toISOString(),
            direction: 'OUTBOUND'
          },
          {
            id: 'call-2',
            fromNumber: '+1987654321',
            status: 'failed',
            duration: 0,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            direction: 'INBOUND'
          }
        ],
        total: 2,
        page: 1,
        limit: 20
      })
    });
  });
  
  // Set auth token in localStorage
  await page.addInitScript(() => {
    localStorage.setItem('auth_token', 'mock-jwt-token');
  });
}

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
    await page.goto('/dashboard');
  });

  test('should display dashboard with correct elements', async ({ page }) => {
    await expect(page.locator('h4')).toContainText('Dashboard');
    
    // Check quick actions card
    await expect(page.locator('text=Quick Actions')).toBeVisible();
    await expect(page.locator('button:has-text("Make Call")')).toBeVisible();
    await expect(page.locator('button:has-text("View History")')).toBeVisible();
    
    // Check call statistics
    await expect(page.locator('text=Call Statistics')).toBeVisible();
    await expect(page.locator('text=Total Calls')).toBeVisible();
    await expect(page.locator('text=Completed')).toBeVisible();
    await expect(page.locator('text=Avg Duration')).toBeVisible();
    
    // Check recent calls
    await expect(page.locator('text=Recent Calls')).toBeVisible();
    
    // Check system status
    await expect(page.locator('text=System Status')).toBeVisible();
  });

  test('should show correct call statistics', async ({ page }) => {
    // Wait for call history to load
    await page.waitForSelector('text=2', { timeout: 5000 });
    
    // Should show 2 total calls
    const totalCallsElement = page.locator('[data-testid="total-calls"], :text("2"):near(:text("Total Calls"))');
    await expect(totalCallsElement.first()).toBeVisible();
    
    // Should show 1 completed call
    const completedCallsElement = page.locator(':text("1"):near(:text("Completed"))');
    await expect(completedCallsElement.first()).toBeVisible();
  });

  test('should display recent calls', async ({ page }) => {
    // Wait for calls to load
    await page.waitForSelector('text=+1234567890', { timeout: 5000 });
    
    // Should show call numbers
    await expect(page.locator('text=+1234567890')).toBeVisible();
    
    // Should show call statuses
    await expect(page.locator('text=Completed')).toBeVisible();
    await expect(page.locator('text=Failed')).toBeVisible();
  });

  test('should show system status correctly', async ({ page }) => {
    // Should show HubSpot as connected
    await expect(page.locator('text=HubSpot Integration')).toBeVisible();
    await expect(page.locator('text=Connected').first()).toBeVisible();
  });

  test('should navigate to make call page', async ({ page }) => {
    await page.locator('button:has-text("Make Call")').click();
    await expect(page).toHaveURL(/.*\/call/);
  });

  test('should navigate to call history page', async ({ page }) => {
    await page.locator('button:has-text("View History")').click();
    await expect(page).toHaveURL(/.*\/history/);
  });

  test('should show connection status in header', async ({ page }) => {
    // Should show online status
    await expect(page.locator('text=Online')).toBeVisible();
    
    // Should show HubSpot connected status
    await expect(page.locator('text=HubSpot Connected')).toBeVisible();
  });

  test('should display user menu', async ({ page }) => {
    // Click on user avatar
    await page.locator('[data-testid="user-avatar"], .MuiAvatar-root').click();
    
    // Should show user ID
    await expect(page.locator('text=User ID:')).toBeVisible();
    
    // Should show logout option
    await expect(page.locator('text=Logout')).toBeVisible();
  });

  test('should handle empty call history', async ({ page }) => {
    // Mock empty call history
    await page.route('**/api/calls/history', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          calls: [],
          total: 0,
          page: 1,
          limit: 20
        })
      });
    });
    
    await page.reload();
    
    // Should show empty state message
    await expect(page.locator('text=No calls yet')).toBeVisible();
  });
});