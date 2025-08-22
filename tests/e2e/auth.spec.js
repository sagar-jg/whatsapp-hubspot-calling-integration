const { test, expect } = require('@playwright/test');

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should redirect to login page when not authenticated', async ({ page }) => {
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator('h4')).toContainText('WhatsApp Calling');
    await expect(page.locator('button')).toContainText('Connect to HubSpot');
  });

  test('should display login page with correct elements', async ({ page }) => {
    await page.goto('/login');
    
    // Check main elements
    await expect(page.locator('h4')).toContainText('WhatsApp Calling');
    await expect(page.locator('text=HubSpot Integration')).toBeVisible();
    await expect(page.locator('button:has-text("Connect to HubSpot")')).toBeVisible();
    
    // Check features list
    await expect(page.locator('text=Make WhatsApp calls directly from HubSpot')).toBeVisible();
    await expect(page.locator('text=Automatic call logging and engagement tracking')).toBeVisible();
    await expect(page.locator('text=WebRTC-powered voice calls')).toBeVisible();
    await expect(page.locator('text=Real-time call status and duration tracking')).toBeVisible();
  });

  test('should handle OAuth flow initiation', async ({ page, context }) => {
    await page.goto('/login');
    
    // Mock the OAuth URL generation
    await page.route('**/api/auth/hubspot/oauth-url', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          authUrl: 'https://app.hubspot.com/oauth/authorize?client_id=test',
          state: 'test-state'
        })
      });
    });
    
    // Click connect button and expect navigation
    const connectButton = page.locator('button:has-text("Connect to HubSpot")');
    await connectButton.click();
    
    // Should redirect to HubSpot OAuth
    await page.waitForURL(/.*hubspot\.com.*/);
  });

  test('should handle OAuth callback', async ({ page }) => {
    // Mock successful OAuth callback
    await page.route('**/api/auth/hubspot/callback', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          token: 'mock-jwt-token',
          userId: 'test-user-123',
          expiresIn: 3600
        })
      });
    });
    
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
    
    // Simulate OAuth callback URL
    await page.goto('/login?code=test-code&state=test-state');
    
    // Should show loading state first
    await expect(page.locator('text=Connecting to HubSpot')).toBeVisible();
    
    // Then redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should handle OAuth errors', async ({ page }) => {
    await page.goto('/login?error=access_denied&error_description=User%20denied%20access');
    
    await expect(page.locator('[role="alert"]')).toContainText('OAuth error: access_denied');
  });

  test('should show loading states appropriately', async ({ page }) => {
    // Mock slow OAuth callback
    await page.route('**/api/auth/hubspot/callback', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          token: 'mock-jwt-token'
        })
      });
    });
    
    await page.goto('/login?code=test-code&state=test-state');
    
    // Should show progress stepper
    await expect(page.locator('text=Processing Authorization')).toBeVisible();
    await expect(page.locator('[role="progressbar"]')).toBeVisible();
  });
});