import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Initialize Supabase client with service role key for backend operations
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const url = new URL(req.url)
    const checkoutRequestId = url.searchParams.get('checkoutRequestId')

    if (!checkoutRequestId) {
      return new Response(
        JSON.stringify({ error: 'Checkout request ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check the status of the checkout request in our database
    const { data, error } = await supabase
      .from('mpesa_checkouts')
      .select('*')
      .eq('checkout_request_id', checkoutRequestId)
      .single()

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Checkout request not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Return the current status
    return new Response(
      JSON.stringify({
        status: data.status,
        mpesaReceiptNumber: data.mpesa_receipt_number,
        resultCode: data.result_code,
        resultDescription: data.result_description
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error checking M-Pesa status:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})