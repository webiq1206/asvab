import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

interface AppleReceiptValidation {
  isValid: boolean;
  transactionId?: string;
  productId?: string;
  purchaseDate?: number;
  expiresDate?: number;
  originalTransactionId?: string;
  error?: string;
}

@Injectable()
export class AppStoreService {
  private readonly verifyReceiptUrl: string;
  private readonly sandboxVerifyReceiptUrl: string;
  private readonly sharedSecret: string;

  constructor(private configService: ConfigService) {
    this.verifyReceiptUrl = 'https://buy.itunes.apple.com/verifyReceipt';
    this.sandboxVerifyReceiptUrl = 'https://sandbox.itunes.apple.com/verifyReceipt';
    this.sharedSecret = this.configService.get<string>('APPLE_APP_STORE_SHARED_SECRET');
  }

  async validateReceipt(receiptData: string): Promise<AppleReceiptValidation> {
    try {
      // First try production
      let response = await this.verifyReceiptWithApple(receiptData, this.verifyReceiptUrl);
      
      // If status is 21007, receipt is from sandbox, try sandbox URL
      if (response.status === 21007) {
        response = await this.verifyReceiptWithApple(receiptData, this.sandboxVerifyReceiptUrl);
      }

      if (response.status !== 0) {
        return {
          isValid: false,
          error: this.getErrorMessage(response.status),
        };
      }

      // Parse the receipt info
      const latestReceiptInfo = response.latest_receipt_info || response.receipt?.in_app;
      if (!latestReceiptInfo || latestReceiptInfo.length === 0) {
        return {
          isValid: false,
          error: 'No transaction found in receipt',
        };
      }

      // Get the most recent transaction
      const transaction = latestReceiptInfo[latestReceiptInfo.length - 1];

      return {
        isValid: true,
        transactionId: transaction.transaction_id,
        originalTransactionId: transaction.original_transaction_id,
        productId: transaction.product_id,
        purchaseDate: parseInt(transaction.purchase_date_ms),
        expiresDate: parseInt(transaction.expires_date_ms),
      };
    } catch (error) {
      console.error('Apple receipt validation error:', error);
      return {
        isValid: false,
        error: 'Failed to validate receipt',
      };
    }
  }

  private async verifyReceiptWithApple(receiptData: string, url: string) {
    const requestBody = {
      'receipt-data': receiptData,
      'password': this.sharedSecret,
      'exclude-old-transactions': true,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  private getErrorMessage(status: number): string {
    const errorMessages: Record<number, string> = {
      21000: 'The App Store could not read the JSON object you provided.',
      21002: 'The data in the receipt-data property was malformed or missing.',
      21003: 'The receipt could not be authenticated.',
      21004: 'The shared secret you provided does not match the shared secret on file for your account.',
      21005: 'The receipt server is not currently available.',
      21006: 'This receipt is valid but the subscription has expired.',
      21007: 'This receipt is from the sandbox environment.',
      21008: 'This receipt is from the production environment.',
      21010: 'This receipt could not be authorized.',
    };

    return errorMessages[status] || `Unknown error: ${status}`;
  }

  async verifyServerToServerNotification(payload: string, signature: string): Promise<boolean> {
    try {
      // In a production app, you would verify the signature using Apple's public key
      // This is a simplified implementation
      const expectedSignature = createHash('sha256')
        .update(payload + this.sharedSecret)
        .digest('base64');

      return signature === expectedSignature;
    } catch (error) {
      console.error('Apple notification verification error:', error);
      return false;
    }
  }

  async handleServerToServerNotification(notification: any) {
    const { notification_type, latest_receipt_info, auto_renew_status } = notification;
    
    switch (notification_type) {
      case 'INITIAL_BUY':
        return this.handleInitialPurchase(latest_receipt_info);
      case 'CANCEL':
        return this.handleCancellation(latest_receipt_info);
      case 'RENEWAL':
        return this.handleRenewal(latest_receipt_info);
      case 'INTERACTIVE_RENEWAL':
        return this.handleInteractiveRenewal(latest_receipt_info);
      case 'DID_CHANGE_RENEWAL_PREF':
        return this.handleRenewalPreferenceChange(auto_renew_status);
      case 'DID_CHANGE_RENEWAL_STATUS':
        return this.handleRenewalStatusChange(auto_renew_status);
      default:
        console.log('Unhandled notification type:', notification_type);
        return null;
    }
  }

  private handleInitialPurchase(receiptInfo: any) {
    return {
      type: 'PURCHASE',
      transactionId: receiptInfo.transaction_id,
      productId: receiptInfo.product_id,
      purchaseDate: parseInt(receiptInfo.purchase_date_ms),
      expiresDate: parseInt(receiptInfo.expires_date_ms),
    };
  }

  private handleCancellation(receiptInfo: any) {
    return {
      type: 'CANCEL',
      transactionId: receiptInfo.transaction_id,
      cancellationDate: parseInt(receiptInfo.cancellation_date_ms),
    };
  }

  private handleRenewal(receiptInfo: any) {
    return {
      type: 'RENEWAL',
      transactionId: receiptInfo.transaction_id,
      expiresDate: parseInt(receiptInfo.expires_date_ms),
    };
  }

  private handleInteractiveRenewal(receiptInfo: any) {
    return {
      type: 'INTERACTIVE_RENEWAL',
      transactionId: receiptInfo.transaction_id,
      expiresDate: parseInt(receiptInfo.expires_date_ms),
    };
  }

  private handleRenewalPreferenceChange(autoRenewStatus: string) {
    return {
      type: 'RENEWAL_PREF_CHANGE',
      autoRenewEnabled: autoRenewStatus === '1',
    };
  }

  private handleRenewalStatusChange(autoRenewStatus: string) {
    return {
      type: 'RENEWAL_STATUS_CHANGE',
      autoRenewEnabled: autoRenewStatus === '1',
    };
  }
}