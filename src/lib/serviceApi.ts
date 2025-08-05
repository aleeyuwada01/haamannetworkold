import { smePlugAPI } from './smePlugApi';
import { supabase } from './supabase';
import { generateTransactionReference } from './utils';

export type ServiceType = 'airtime' | 'data' | 'electricity';

export interface ServiceTransaction {
  id: string;
  user_id: string;
  type: ServiceType;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  reference: string;
  details: any;
  external_reference?: string;
  created_at: string;
}

class ServiceAPI {
  async processAirtimeTransaction(
    userId: string,
    data: {
      network: string;
      amount: number;
      phoneNumber: string;
    }
  ): Promise<ServiceTransaction> {
    const reference = generateTransactionReference();
    
    // Create pending transaction
    const transaction = {
      user_id: userId,
      type: 'airtime' as ServiceType,
      amount: data.amount,
      status: 'pending' as const,
      reference,
      details: {
        network: data.network,
        phone: data.phoneNumber,
        service_provider: 'smeplug',
      },
    };

    const { data: dbTransaction, error: dbError } = await supabase
      .from('transactions')
      .insert([transaction])
      .select()
      .single();

    if (dbError) {
      console.error('Database error creating transaction:', dbError);
      throw new Error('Failed to create transaction record. Please try again.');
    }

    try {
      // Call SME Plug API
      const apiResponse = await smePlugAPI.buyAirtime({
        network: data.network as any,
        amount: data.amount,
        mobile_number: data.phoneNumber,
      });

      // Update transaction as successful
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: 'success',
          details: {
            ...transaction.details,
            api_response: apiResponse,
            external_reference: apiResponse?.reference || apiResponse?.id || 'N/A', // SME Plug VTU might not return reference
          },
        })
        .eq('id', dbTransaction.id);

      if (updateError) {
        console.error('Database error updating transaction:', updateError);
        // Don't throw here as the API call was successful
      }

      return {
        ...dbTransaction,
        status: 'success',
      };
    } catch (error: any) {
      console.error('API error during airtime purchase:', error);
      
      // Update transaction as failed
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: 'failed',
          details: {
            ...transaction.details,
            error: error instanceof Error ? error.message : 'Unknown error',
            error_time: new Date().toISOString(),
          },
        })
        .eq('id', dbTransaction.id);

      if (updateError) {
        console.error('Database error updating failed transaction:', updateError);
      }

      // Provide user-friendly error messages based on the specific error
      if (error.message.includes('API token not configured') || 
          error.message.includes('YOUR_SMEPLUG_TOKEN_HERE')) {
        throw new Error('Payment service not configured. Please contact support to set up the payment system.');
      }
      
      if (error.message.includes('API configuration not found') ||
          error.message.includes('API configuration is incomplete')) {
        throw new Error('Payment service configuration missing. Please contact support.');
      }
      
      if (error.message.includes('Unable to connect') || 
          error.message.includes('Network connection error') ||
          error.message.includes('timeout') || 
          error.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to payment service. Please check your internet connection and try again.');
      }
      
      if (error.message.includes('API authentication failed') ||
          error.message.includes('API access denied')) {
        throw new Error('Payment service authentication error. Please contact support.');
      }
      
      if (error.message.includes('API server error') ||
          error.message.includes('Service configuration error')) {
        throw new Error('Payment service temporarily unavailable. Please try again later or contact support.');
      }

      // For any other errors, use the original message or a generic fallback
      throw new Error(error.message || 'Transaction failed. Please try again or contact support if the issue persists.');
    }
  }

  async processDataTransaction(
    userId: string,
    data: {
      network: string;
      plan: string;
      phoneNumber: string;
      amount: number;
    }
  ): Promise<ServiceTransaction> {
    // NOTE: SME Plug API documentation does not provide an endpoint for purchasing data.
    // This function will currently only fetch data plans, not process a purchase.
    // You will need to implement the actual purchase logic once the SME Plug API provides it.
    console.warn('Data purchase functionality is not fully implemented due to missing SME Plug API endpoint.');

    const reference = generateTransactionReference();
    
    // Create pending transaction
    const transaction = {
      user_id: userId,
      type: 'data' as ServiceType,
      amount: data.amount,
      status: 'pending' as const,
      reference,
      details: {
        network: data.network,
        plan: data.plan,
        phone: data.phoneNumber,
        service_provider: 'smeplug',
      },
    };

    const { data: dbTransaction, error: dbError } = await supabase
      .from('transactions')
      .insert([transaction])
      .select()
      .single();

    if (dbError) {
      console.error('Database error creating transaction:', dbError);
      throw new Error('Failed to create transaction record. Please try again.');
    }

    try {
      // For now, we'll simulate a failure as purchase endpoint is missing
      throw new Error('Data purchase API endpoint is not available from SME Plug. Cannot complete transaction.');

      // Once SME Plug provides a data purchase endpoint, uncomment and modify the following:
      // const apiResponse = await smePlugAPI.buyData({
      //   network_id: data.network as any, // Assuming network_id is needed
      //   phone_number: data.phoneNumber,
      //   plan_id: parseInt(data.plan), // Assuming plan_id is needed
      // });

      // // Update transaction as successful
      // const { error: updateError } = await supabase
      //   .from('transactions')
      //   .update({
      //     status: 'success',
      //     details: {
      //       ...transaction.details,
      //       api_response: apiResponse,
      //       external_reference: apiResponse?.reference || apiResponse?.id,
      //     },
      //   })
      //   .eq('id', dbTransaction.id);

      // if (updateError) {
      //   console.error('Database error updating transaction:', updateError);
      //   // Don't throw here as the API call was successful
      // }

      // return {
      //   ...dbTransaction,
      //   status: 'success',
      // };
    } catch (error: any) {
      console.error('API error during data purchase:', error);
      
      // Update transaction as failed
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: 'failed',
          details: {
            ...transaction.details,
            error: error instanceof Error ? error.message : 'Unknown error',
            error_time: new Date().toISOString(),
          },
        })
        .eq('id', dbTransaction.id);

      if (updateError) {
        console.error('Database error updating failed transaction:', updateError);
      }

      // Provide user-friendly error messages based on the specific error
      if (error.message.includes('API token not configured') || 
          error.message.includes('YOUR_SMEPLUG_TOKEN_HERE')) {
        throw new Error('Payment service not configured. Please contact support to set up the payment system.');
      }
      
      if (error.message.includes('API configuration not found') ||
          error.message.includes('API configuration is incomplete')) {
        throw new Error('Payment service configuration missing. Please contact support.');
      }
      
      if (error.message.includes('Unable to connect') || 
          error.message.includes('Network connection error') ||
          error.message.includes('timeout') || 
          error.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to payment service. Please check your internet connection and try again.');
      }
      
      if (error.message.includes('API authentication failed') ||
          error.message.includes('API access denied')) {
        throw new Error('Payment service authentication error. Please contact support.');
      }
      
      if (error.message.includes('API server error') ||
          error.message.includes('Service configuration error')) {
        throw new Error('Payment service temporarily unavailable. Please try again later or contact support.');
      }

      // For any other errors, use the original message or a generic fallback
      throw new Error(error.message || 'Transaction failed. Please try again or contact support if the issue persists.');
    }
  }

  // NOTE: SME Plug API documentation does not provide an endpoint for electricity payments.
  // This functionality is removed.
  // async processElectricityTransaction(
  //   userId: string,
  //   data: {
  //     disco: string;
  //     amount: number;
  //     meterNumber: string;
  //     meterType: string;
  //   }
  // ): Promise<ServiceTransaction> {
  //   throw new Error('Electricity payment not supported by current SME Plug API documentation.');
  // }
}

export const serviceAPI = new ServiceAPI();