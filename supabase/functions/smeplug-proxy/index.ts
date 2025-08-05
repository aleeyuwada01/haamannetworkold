import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

// Network mappings for SME Plug API
const NETWORK_MAPPINGS = {
  'mtn': 1,
  'airtel': 2,
  '9mobile': 3,
  'glo': 4,
} as const;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get API settings from database
    const { data: settings, error: settingsError } = await supabaseClient
      .from('api_settings')
      .select('key_name, key_value')
      .in('key_name', ['smeplug_token', 'smeplug_base_url'])

    if (settingsError) {
      throw new Error('Failed to fetch API configuration')
    }

    const tokenSetting = settings?.find(s => s.key_name === 'smeplug_token')
    const baseUrlSetting = settings?.find(s => s.key_name === 'smeplug_base_url')

    if (!tokenSetting?.key_value || !baseUrlSetting?.key_value) {
      throw new Error('API configuration not found')
    }

    if (tokenSetting.key_value === 'YOUR_SMEPLUG_TOKEN_HERE') {
      throw new Error('API token not configured. Please update the token in admin settings.')
    }

    const token = tokenSetting.key_value
    const baseUrl = baseUrlSetting.key_value.replace(/\/$/, '')

    // Parse request
    const { action, data } = await req.json()

    let apiEndpoint = ''
    let apiPayload: any = {}
    let requestMethod = 'POST'

    // Route based on action
    switch (action) {
      case 'buy_airtime':
        apiEndpoint = '/vtu'
        apiPayload = {
          network_id: data.network_id,
          phone_number: data.phone_number,
          amount: data.amount,
          type: data.type, // 1 for VTU
        }
        break

      case 'get_data_plans':
        apiEndpoint = '/data/plans'
        requestMethod = 'GET'
        // No payload for GET request
        break

      // NOTE: SME Plug API documentation does not provide an endpoint for purchasing data.
      // case 'buy_data':
      //   apiEndpoint = '/data' // Placeholder endpoint
      //   apiPayload = {
      //     network_id: data.network_id,
      //     phone_number: data.phone_number,
      //     plan_id: data.plan_id,
      //   }
      //   break

      // NOTE: SME Plug API documentation does not provide an endpoint for electricity payments.
      // case 'buy_electricity':
      //   throw new Error('Electricity payment not supported by SME Plug API documentation.');

      default:
        throw new Error('Invalid action')
    }

    // Make request to SME Plug API
    const response = await fetch(`${baseUrl}${apiEndpoint}`, {
      method: requestMethod,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: requestMethod === 'POST' ? JSON.stringify(apiPayload) : undefined,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API request failed: ${response.status} - ${errorText}`)
    }

    // Handle response
    let result
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      result = await response.json()
    } else {
      // SME Plug VTU returns empty body for success
      result = { status: true, message: 'Success' } 
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Edge function error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})