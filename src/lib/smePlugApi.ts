import { supabase } from './supabase';

// Network mappings for SME Plug API
export const NETWORK_MAPPINGS = {
  'mtn': 1,
  'airtel': 2,
  '9mobile': 3,
  'glo': 4,
} as const;

class SMEPlugAPI {
  private getEdgeFunctionUrl() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }
    return `${supabaseUrl}/functions/v1/smeplug-proxy`;
  }

  private async makeEdgeFunctionRequest(action: string, data: any) {
    try {
      const url = this.getEdgeFunctionUrl();
      const token = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!token) {
        throw new Error('Supabase anon key not configured');
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, data }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Request failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'API request failed');
      }

      return result.data;

    } catch (error: any) {
      console.error('Edge function request error:', error);
      
      if (error.message === 'Failed to fetch') {
        throw new Error('Unable to connect to payment service. Please check your internet connection and try again.');
      }
      
      if (error.message.includes('NetworkError') || 
          error.message.includes('ERR_NETWORK') ||
          error.message.includes('ERR_INTERNET_DISCONNECTED')) {
        throw new Error('Network connection error. Please check your internet connection and try again.');
      }

      throw error;
    }
  }

  async buyAirtime(data: {
    network: keyof typeof NETWORK_MAPPINGS;
    amount: number;
    mobile_number: string;
  }) {
    return await this.makeEdgeFunctionRequest('buy_airtime', {
      network_id: NETWORK_MAPPINGS[data.network],
      phone_number: data.mobile_number,
      amount: data.amount,
      type: 1, // 1 for VTU
    });
  }

  async getDataPlans() {
    return await this.makeEdgeFunctionRequest('get_data_plans', {});
  }

  // NOTE: SME Plug API documentation does not provide an endpoint for purchasing data.
  // This functionality cannot be implemented without that information.
  // async buyData(data: {
  //   network_id: number;
  //   phone_number: string;
  //   plan_id: number;
  // }) {
  //   // Placeholder - actual endpoint and payload needed from SME Plug documentation
  //   return await this.makeEdgeFunctionRequest('buy_data', {
  //     network_id: data.network_id,
  //     phone_number: data.phone_number,
  //     plan_id: data.plan_id,
  //   });
  // }

  // NOTE: SME Plug API documentation does not provide an endpoint for electricity payments.
  // This functionality cannot be implemented with the current documentation.
  // async buyElectricity(data: {
  //   disco_name: string;
  //   amount: number;
  //   meter_number: string;
  //   meter_type: 'prepaid' | 'postpaid';
  // }) {
  //   throw new Error('Electricity payment not supported by current SME Plug API documentation.');
  // }
}

export const smePlugAPI = new SMEPlugAPI();