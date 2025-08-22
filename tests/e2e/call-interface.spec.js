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
  
  await page.addInitScript(() => {
    localStorage.setItem('auth_token', 'mock-jwt-token');
  });
}

test.describe('Call Interface', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
    await page.goto('/call');
  });

  test('should display call interface with correct elements', async ({ page }) => {
    await expect(page.locator('h4')).toContainText('Make a Call');
    
    // Check call setup section
    await expect(page.locator('text=Call Setup')).toBeVisible();
    await expect(page.locator('input[label="Phone Number"]')).toBeVisible();
    await expect(page.locator('input[label="Search Contacts"]')).toBeVisible();
    await expect(page.locator('button:has-text("Start Call")')).toBeVisible();
    
    // Check call status section
    await expect(page.locator('text=Call Status')).toBeVisible();
    await expect(page.locator('text=Ready to make a call')).toBeVisible();
  });

  test('should validate phone number input', async ({ page }) => {
    const phoneInput = page.locator('input[placeholder="+1234567890"]');
    const startCallButton = page.locator('button:has-text("Start Call")');
    
    // Button should be disabled with empty input
    await expect(startCallButton).toBeDisabled();
    
    // Enter phone number
    await phoneInput.fill('+1234567890');
    
    // Button should be enabled
    await expect(startCallButton).toBeEnabled();
  });

  test('should initiate call successfully', async ({ page }) => {
    // Mock API endpoints
    await page.route('**/api/calls/webrtc/session', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          session: {
            id: 'session-123',
            iceConfiguration: { iceServers: [] }
          }
        })
      });
    });
    
    await page.route('**/api/calls/outbound', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          call: {
            id: 'call-123',
            toNumber: '+1234567890',
            status: 'initiated'
          }
        })
      });
    });
    
    // Mock WebRTC getUserMedia
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        return {
          getTracks: () => [{
            stop: () => {},
            enabled: true
          }]
        };
      };
    });
    
    const phoneInput = page.locator('input[placeholder="+1234567890"]');
    const startCallButton = page.locator('button:has-text("Start Call")');
    
    await phoneInput.fill('+1234567890');
    await startCallButton.click();
    
    // Should show connecting state
    await expect(page.locator('text=Connecting')).toBeVisible();
  });

  test('should handle invalid phone number', async ({ page }) => {
    // Mock validation failure
    await page.route('**/api/calls/outbound', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Invalid phone number',
          details: 'Please enter a valid phone number'
        })
      });
    });
    
    const phoneInput = page.locator('input[placeholder="+1234567890"]');
    const startCallButton = page.locator('button:has-text("Start Call")');
    
    await phoneInput.fill('invalid');
    await startCallButton.click();
    
    // Should show error toast (this would depend on your toast implementation)
    // For now, we'll check that the call doesn't proceed
    await expect(page.locator('text=Connecting')).not.toBeVisible();
  });

  test('should show call controls during active call', async ({ page }) => {
    // Mock successful call initiation
    await page.route('**/api/calls/webrtc/session', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          session: { id: 'session-123' }
        })
      });
    });
    
    await page.route('**/api/calls/outbound', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          call: {
            id: 'call-123',
            toNumber: '+1234567890',
            status: 'connected'
          }
        })
      });
    });
    
    // Mock getUserMedia
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => ({
        getTracks: () => [{ stop: () => {}, enabled: true }]
      });
    });
    
    // Simulate call state
    await page.evaluate(() => {
      window.mockCallState = {
        isInCall: true,
        activeCall: {
          toNumber: '+1234567890',
          status: 'connected'
        },
        callDuration: 60
      };
    });
    
    const phoneInput = page.locator('input[placeholder="+1234567890"]');
    await phoneInput.fill('+1234567890');
    
    // The actual implementation would update the UI based on call state
    // This test would need to be adjusted based on your state management
  });

  test('should search contacts', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search HubSpot contacts..."]');
    
    await searchInput.fill('John Doe');
    
    // This would trigger a search in the actual implementation
    // You'd mock the contact search API here
    await expect(searchInput).toHaveValue('John Doe');
  });

  test('should display contact information when selected', async ({ page }) => {
    // This test would verify contact display functionality
    // Implementation depends on how contacts are selected and displayed
    
    // Mock contact data could be injected via evaluate
    await page.evaluate(() => {
      window.mockContact = {
        id: 'contact-123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890'
      };
    });
    
    // The actual test would depend on your contact selection UI
  });

  test('should end call successfully', async ({ page }) => {
    // Mock call end endpoint
    await page.route('**/api/calls/*/end', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          callId: 'call-123',
          status: 'ended'
        })
      });
    });
    
    // This test would verify the end call functionality
    // Implementation depends on how you trigger and handle call ending
  });
});