const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars. Ensure ../../.env.local is loaded or vars are set.');
    // Check if we can read them manually (copy-paste of logic from previous step)
    const fs = require('fs');
    try {
        const envConfig = fs.readFileSync('../../.env.local', 'utf8');
        envConfig.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                let val = parts.slice(1).join('=').trim();
                if (val.startsWith('"')) val = val.slice(1, -1);
                process.env[key] = val;
            }
        });
    } catch (e) { }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function debugAnalytics() {
    console.log('--- Debugging Analytics Data ---');

    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - 30); // 30d default

    console.log(`Date Range: ${startDate.toISOString()} to ${now.toISOString()}`);

    // 1. Check Profiles (New Customers)
    const { count: newCustomers, error: profileError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

    console.log('1. New Customers Count (Last 30d):', newCustomers);
    if (profileError) console.error('   Error:', profileError);

    // 1b. Check ALL Profiles
    const { count: totalProfiles } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
    console.log('   Total Profiles in DB:', totalProfiles);

    // 2. Check Recent Orders
    console.log('\n2. Recent Orders Query:');
    const { data: rawRecentOrders, error: orderError } = await supabase
        .from('orders')
        .select('id, created_at, total, status, user_id, customer_email')
        .order('created_at', { ascending: false })
        .limit(5);

    if (orderError) {
        console.error('   Error:', orderError);
    } else {
        console.log(`   Fetched ${rawRecentOrders?.length} rows.`);
        rawRecentOrders?.forEach(o => {
            console.log(`   - ID: ${o.id}, UserID: ${o.user_id}, Total: ${o.total}, Created: ${o.created_at}`);
        });
    }
}

debugAnalytics();
