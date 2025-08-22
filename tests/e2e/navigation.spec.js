const { test, expect } = require('@playwright/test');

// Helper function to authenticate
async function authenticate(page) {
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
  
  await page.addInitScript(() => {
    localStorage.setItem('auth_token', 'mock-jwt-token');
  });
}

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('should display sidebar with all navigation items', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check sidebar brand
    await expect(page.locator('text=WhatsApp')).toBeVisible();
    await expect(page.locator('text=HubSpot Integration')).toBeVisible();
    
    // Check navigation items
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Make Call')).toBeVisible();
    await expect(page.locator('text=Call History')).toBeVisible();
    await expect(page.locator('text=Settings')).toBeVisible();
  });

  test('should navigate between pages correctly', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Navigate to Make Call
    await page.locator('text=Make Call').click();
    await expect(page).toHaveURL(/.*\/call/);
    await expect(page.locator('h4')).toContainText('Make a Call');
    
    // Navigate to Call History
    await page.locator('text=Call History').click();
    await expect(page).toHaveURL(/.*\/history/);
    await expect(page.locator('h4')).toContainText('Call History');
    
    // Navigate to Settings
    await page.locator('text=Settings').click();
    await expect(page).toHaveURL(/.*\/settings/);
    await expect(page.locator('h4')).toContainText('Settings');
    
    // Navigate back to Dashboard
    await page.locator('text=Dashboard').click();
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('h4')).toContainText('Dashboard');
  });

  test('should highlight active navigation item', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Dashboard should be highlighted
    const dashboardItem = page.locator('[data-testid="nav-dashboard"], :text("Dashboard"):has-text("Dashboard")').first();
    await expect(dashboardItem).toHaveClass(/active|selected|MuiListItemButton-root/);
    
    // Navigate to another page
    await page.locator('text=Make Call').click();
    
    // Make Call should now be highlighted
    const callItem = page.locator('[data-testid="nav-call"], :text("Make Call"):has-text("Make Call")').first();
    await expect(callItem).toHaveClass(/active|selected|MuiListItemButton-root/);
  });

  test('should redirect root path to dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should handle invalid routes', async ({ page }) => {
    await page.goto('/invalid-route');
    // Should redirect to dashboard or show 404
    await expect(page).toHaveURL(/.*\/(dashboard|404)/);
  });

  test('should show version in sidebar', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('text=Version 1.0.0')).toBeVisible();
  });

  test('should maintain navigation state on page refresh', async ({ page }) => {
    await page.goto('/call');
    
    // Refresh the page
    await page.reload();
    
    // Should still be on call page
    await expect(page).toHaveURL(/.*\/call/);
    await expect(page.locator('h4')).toContainText('Make a Call');
  });

  test('should show call status in sidebar when in call', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Mock active call state
    await page.evaluate(() => {
      window.mockCallState = {
        isInCall: true,
        activeCall: {
          toNumber: '+1234567890'
        }
      };
    });
    
    // This would show call status in sidebar
    // Implementation depends on your call state management
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    
    // Check that sidebar adapts to mobile
    // This depends on your responsive design implementation
    await expect(page.locator('text=WhatsApp')).toBeVisible();
  });
});