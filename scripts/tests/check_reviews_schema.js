
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkReviews() {
    console.log('Checking reviews table...');

    // Check if columns exist by trying to select them
    const { data, error } = await supabase
        .from('reviews')
        .select('id, reply, replied_at')
        .limit(1);

    if (error) {
        console.error('Error fetching reviews:', error);
    } else {
        console.log('Columns appear to exist. Sample data:', data);
    }
}

checkReviews();
