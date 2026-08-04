import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Initialize Supabase client with service role key for backend operations
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Helper function to format phone number for consistent comparison
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

// Update checkout request with callback result
async function updateCheckoutRequest(
  checkoutRequestID: string,
  resultCode: number,
  resultDesc: string,
  mpesaReceiptNumber?: string,
  transactionDate?: string,
  phoneNumber?: string,
  amount?: number
) {
  const updateData: any = {
    result_code: resultCode,
    result_description: resultDesc,
    updated_at: new Date().toISOString(),
    status: resultCode === 0 ? 'completed' : 'failed'
  }

  if (mpesaReceiptNumber) {
    updateData.mpesa_receipt_number = mpesaReceiptNumber
  }

  if (transactionDate) {
    // Format the timestamp from M-Pesa (YYYYMMDDHHMMSS) to ISO
    const year = transactionDate.substring(0, 4)
    const month = transactionDate.substring(4, 6)
    const day = transactionDate.substring(6, 8)
    const hour = transactionDate.substring(8, 10)
    const minute = transactionDate.substring(10, 12)
    const second = transactionDate.substring(12, 14)
    const formattedDate = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`
    updateData.transaction_date = formattedDate
  }

  if (phoneNumber !== undefined) {
    updateData.phone_number = phoneNumber
  }

  if (amount !== undefined) {
    updateData.amount = amount
  }

  const { error } = await supabase
    .from('mpesa_checkouts')
    .update(updateData)
    .eq('checkout_request_id', checkoutRequestID)

  if (error) {
    console.error('Error updating checkout request:', error)
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

  // Daraja sends callback via POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    // Parse the callback data from Daraja
    const callbackData = await req.json()

    // Log the received callback for debugging
    console.log('Received M-Pesa callback:', JSON.stringify(callbackData, null, 2))

    // Extract the relevant data from the callback
    const stkCallback = callbackData.Body?.stkCallback
    if (!stkCallback) {
      console.error('Invalid callback format received')
      return new Response(
        JSON.stringify({ error: 'Invalid callback format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata
    } = stkCallback

    // Initialize variables for metadata
    let mpesaReceiptNumber = null
    let transactionDate = null
    let phoneNumber = null
    let amount = null

    // Extract metadata if present
    if (CallbackMetadata && CallbackMetadata.Item) {
      for (const item of CallbackMetadata.Item) {
        switch (item.Name) {
          case 'MpesaReceiptNumber':
            mpesaReceiptNumber = item.Value
            break
          case 'TransactionDate':
            transactionDate = item.Value.toString()
            break
          case 'PhoneNumber':
            phoneNumber = item.Value.toString()
            break
          case 'Amount':
            amount = item.Value
            break
        }
      }
    }

    // Format phone number if we got one from callback
    if (phoneNumber) {
      phoneNumber = formatPhoneNumber(phoneNumber)
    }

    // Update our checkout record with the result
    await updateCheckoutRequest(
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      mpesaReceiptNumber,
      transactionDate,
      phoneNumber,
      amount
    )

    // Store result in kv_store for frontend real-time updates
    const checkoutKey = `mpesa_checkout_${CheckoutRequestID}`;
    const { error: kvError } = await supabase
      .from('kv_store')
      .upsert({
        key: checkoutKey,
        value: {
          resultCode: ResultCode,
          resultDescription: ResultDesc,
          mpesaReceiptNumber: mpesaReceiptNumber,
          transactionDate: transactionDate,
          phoneNumber: phoneNumber,
          amount: amount,
          status: ResultCode === 0 ? 'completed' : 'failed'
        },
        updated_at: new Date().toISOString()
      });

    if (kvError) {
      console.error('Error storing checkout result in kv_store:', kvError);
    }

    // Return success response to Daraja (they expect 200 OK)
    // Note: Daraja expects a specific JSON format for acknowledgment
    return new Response(
      JSON.stringify({
        ResultCode: 0,
        ResultDesc: "Accepted"
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error processing M-Pesa callback:', error)

    // Still return 200 to Daraja to prevent retries, but log the error
    // In a production system, you might want to alert administrators
    return new Response(
      JSON.stringify({
        ResultCode: 0,
        ResultDesc: "Accepted"
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})