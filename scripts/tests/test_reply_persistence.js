
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fmwjecuufzgvcdhwvhnx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFub24iLCJpYXQiOjE3NjU0MDMxMDUsImV4cCI6MjA4MDk3OTEwNX0.zLOER3VHGj-V8XtYOi_dSIJxSQ5s29Z7_S88eS9G6JE';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase vars');
    process.exit(1);
}

const client = createClient(supabaseUrl, supabaseKey);

async function testReply() {
    console.log('1. Fetching a review...');
    const { data: reviews, error: fetchError } = await client
        .from('reviews')
        .select('*')
        .limit(1);

    if (fetchError || !reviews.length) {
        console.error('Error fetching or no reviews found:', fetchError);
        return;
    }

    const reviewId = reviews[0].id;
    console.log(`Found review ${reviewId}. Current reply:`, reviews[0].reply);

    console.log('2. Attempting to update reply...');
    const { error: updateError } = await client
        .from('reviews')
        .update({ reply: 'Test Reply via Script', replied_at: new Date().toISOString() })
        .eq('id', reviewId);

    if (updateError) {
        console.error('Update failed:', updateError.message);
        if (updateError.message.includes('policy')) {
            console.log('Likely RLS issue. You need to enable UPDATE for reviews.');
        }
        return;
    }

    console.log('Update successful (ostensibly).');

    console.log('3. Verifying update...');
    const { data: updated, error: verifyError } = await client
        .from('reviews')
        .select('*')
        .eq('id', reviewId)
        .single();

    if (verifyError) {
        console.error('Verification fetch failed:', verifyError);
    } else {
        console.log('Updated review state:', updated);
        console.log('Reply saved?', updated.reply === 'Test Reply via Script');
    }
}

testReply();
