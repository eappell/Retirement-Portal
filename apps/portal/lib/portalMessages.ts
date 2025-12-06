/**
 * Portal Message Types for Cross-App Communication
 * 
 * This module defines standardized message types for communication between
 * the portal and embedded apps, and between embedded apps themselves.
 */

// ============================================================================
// Existing Message Types (for reference)
// ============================================================================

export interface AuthTokenMessage {
  type: 'AUTH_TOKEN';
  token: string;
  userId: string;
  email: string;
  // Use 'paid' to match portal-wide tier naming (was 'premium' in older docs)
  tier: 'free' | 'paid' | 'admin';
}

export interface ThemeChangeMessage {
  type: 'THEME_CHANGE';
  theme: 'light' | 'dark';
}

export interface ToolbarButton {
  id: string;
  label: string;
  icon: string; // SVG string
  tooltip?: string;
}

export interface ToolbarButtonsMessage {
  type: 'TOOLBAR_BUTTONS';
  buttons: ToolbarButton[];
}

export interface ToolbarButtonClickedMessage {
  type: 'TOOLBAR_BUTTON_CLICKED';
  buttonId: string;
}

// ============================================================================
// New: Cross-App Data Transfer Messages
// ============================================================================

/**
 * Message sent from one app requesting to transfer data to another app
 */
export interface AppDataTransferRequest {
  type: 'APP_DATA_TRANSFER';
  sourceApp: string; // e.g., 'healthcare-cost'
  targetApp: string; // e.g., 'retirement-planner'
  dataType: string; // e.g., 'HEALTHCARE_COSTS', 'RELOCATION_DATA'
  data: unknown; // App-specific payload
  metadata?: {
    timestamp: string;
    version?: string;
    [key: string]: unknown;
  };
}

/**
 * Healthcare-specific data structure for transfer to Retirement Planner
 */
export interface HealthcareDataTransfer {
  dataType: 'HEALTHCARE_COSTS';
  targetScenario?: string; // Optional: specific scenario ID in Retirement Planner
  data: {
    // Expense Period for recurring healthcare costs
    expensePeriod: {
      name: string;
      monthlyAmount: number;
      startAge: number;
      endAge: number;
      startAgeRef: 'person1' | 'person2';
      endAgeRef: 'person1' | 'person2';
    };
    
    // Optional: One-time LTC expense
    oneTimeExpense?: {
      age: number;
      amount: number;
      description: string;
      owner: 'person1' | 'person2';
    };
    
    // Metadata about the healthcare projection
    metadata: {
      source: string;
      scenario: 'best' | 'expected' | 'worst';
      totalLifetimeCost: number;
      presentValue: number;
      generatedAt: string;
    };
  };
}

/**
 * Response message after data transfer is processed
 */
export interface AppDataTransferResponse {
  type: 'APP_DATA_TRANSFER_RESPONSE';
  success: boolean;
  sourceApp: string;
  targetApp: string;
  dataType: string;
  message?: string;
  error?: string;
}

/**
 * Request to get available scenarios from Retirement Planner
 */
export interface GetScenariosRequest {
  type: 'GET_SCENARIOS';
  requestId: string;
}

/**
 * Response with available scenarios from Retirement Planner
 */
export interface GetScenariosResponse {
  type: 'GET_SCENARIOS_RESPONSE';
  requestId: string;
  scenarios: Array<{
    id: string;
    name: string;
    isActive?: boolean;
  }>;
}

// ============================================================================
// Union type of all portal messages
// ============================================================================

export type PortalMessage =
  | AuthTokenMessage
  | ThemeChangeMessage
  | ToolbarButtonsMessage
  | ToolbarButtonClickedMessage
  | AppDataTransferRequest
  | AppDataTransferResponse
  | GetScenariosRequest
  | GetScenariosResponse;

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Send a message to the parent portal
 */
export function sendToPortal(message: PortalMessage): void {
  if (window.self !== window.top) {
    window.parent.postMessage(message, '*');
  }
}

/**
 * Send a message to a specific embedded app via the portal
 */
export function sendToApp(targetApp: string, message: PortalMessage): void {
  if (window.self !== window.top) {
    // Send to portal, which will route to the target app
    window.parent.postMessage(
      {
        ...message,
        _routeTo: targetApp,
      },
      '*'
    );
  }
}

/**
 * Type guard to check if a message is a specific type
 */
export function isMessageType<T extends PortalMessage>(
  message: unknown,
  type: T['type']
): message is T {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    message.type === type
  );
}

/**
 * Validate that a message came from a trusted origin
 * In production, this should check against a whitelist
 */
export function isTrustedOrigin(origin: string): boolean {
  // TODO: In production, maintain a whitelist of allowed origins
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:3001',
    'https://retire-portal.vercel.app',
    'https://retirement-planner-ai.vercel.app',
    'https://retire-abroad-ai.vercel.app',
  ];
  
  // For development, allow localhost
  if (origin.startsWith('http://localhost:')) {
    return true;
  }
  
  return allowedOrigins.includes(origin);
}
