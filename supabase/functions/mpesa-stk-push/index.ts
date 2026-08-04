import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Initialize Supabase client with service role key for backend operations
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// M-Pesa Daraja API credentials (should be stored as secrets in Supabase)
const MPESA_CONSUMER_KEY = Deno.env.get('MPESA_CONSUMER_KEY')!
const MPESA_CONSUMER_SECRET = Deno.env.get('MPESA_CONSUMER_SECRET')!
const MPESA_SHORTCODE = Deno.env.get('MPESA_SHORTCODE')! // Your Till Number or Paybill
const MPESA_PASSKEY = Deno.env.get('MPESA_PASSKEY')!
const MPESA_CALLBACK_URL = Deno.env.get('MPESA_CALLBACK_URL')! // Your callback endpoint

// Daraja API endpoints
const MPESA_AUTH_URL = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
// For production: 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
const MPESA_STK_PUSH_URL = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
// For production: 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'

// Helper function to get access token from Daraja
async function getMpesaAccessToken(): Promise<string> {
  const auth = btoa(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`)

  const response = await fetch(MPESA_AUTH_URL, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to get M-Pesa access token: ${response.statusText}`)
  }

  const data = await response.json()
  return data.access_token
}

// Helper function to generate password for STK push
function generatePassword(timestamp: string): string {
  const dataToEncode = `${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`
  return btoa(dataToEncode)
}

// Helper function to format phone number for Kenyan format
function formatPhoneNumber(phone: string): string {
  // Remove any spaces, +, or -
  let cleaned = phone.replace(/[\s\+-]/g, '')

  // If starts with 0, convert to +254
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1)
  }
  // If starts with +, remove +
  else if (cleaned.startsWith('+254')) {
    cleaned = cleaned.substring(1)
  }

  // Ensure it starts with 254
  if (!cleaned.startsWith('254')) {
    cleaned = '254' + cleaned
  }

  return cleaned
}

// Store checkout request for later callback matching
async function storeCheckoutRequest(
  checkoutRequestID: string,
  phoneNumber: string,
  amount: number,
  merchantRequestID: string
) {
  const { error } = await supabase
    .from('mpesa_checkouts')
    .insert({
      checkout_request_id: checkoutRequestID,
      merchant_request_id: merchantRequestID,
      phone_number: phoneNumber,
      amount: amount,
      status: 'pending',
      created_at: new Date().toISOString()
    })

  if (error) {
    console.error('Error storing checkout request:', error)
    throw error
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const { phoneNumber, amount, accountReference, transactionDesc } = await req.json()

    // Validate required fields
    if (!phoneNumber || !amount) {
      return new Response(
        JSON.stringify({ error: 'Phone number and amount are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber)

    // Get access token
    const accessToken = await getMpesaAccessToken()

    // Generate timestamp and password
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, -4)
    const password = generatePassword(timestamp)

    // Prepare STK push request
    const stkPayload = {
      BusinessShortCode: MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.floor(amount), // Amount should be integer
      PartyA: formattedPhone, // Customer's phone number
      PartyB: MPESA_SHORTCODE, // Business short code
      PhoneNumber: formattedPhone, // Mobile number to receive pin
      CallBackURL: MPESA_CALLBACK_URL, // URL where Daraja will call back
      AccountReference: accountReference || 'MedipointPOS',
      TransactionDesc: transactionDesc || 'Payment for medicines'
    }

    // Make STK push request to Daraja
    const stkResponse = await fetch(MPESA_STK_PUSH_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stkPayload)
    })

    const stkData = await stkResponse.json()

    if (!stkResponse.ok) {
      return new Response(
        JSON.stringify({
          error: 'Failed to initiate STK push',
          details: stkData
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Store the checkout request for later callback matching
    await storeCheckoutRequest(
      stkData.CheckoutRequestID,
      formattedPhone,
      amount,
      stkData.MerchantRequestID
    )

    // Return the response to frontend
    return new Response(
      JSON.stringify(stkData),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in M-Pesa STK push function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})