const { createClient } = require('@supabase/supabase-js');

// Load env vars from ../../.env.local manually if needed
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use Service Role to bypass RLS for the setup check

if (!url || !key) {
    console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(url, key);

async function verifyNotifications() {
    console.log('--- Verifying Dashboard Notifications Table ---');

    // 1. Try to INSERT a test notification
    const testId = `test-${Date.now()}`;
    const { data: insertData, error: insertError } = await supabase
        .from('dashboard_activities')
        .insert({
            action_type: 'SYSTEM',
            description: `Debug Test Notification ${testId}`,
            actor_name: 'Debug Script',
            actor_email: 'debug@test.com',
            read: false
        })
        .select()
        .single();

    if (insertError) {
        console.error('❌ Insert Failed:', insertError.message);
        console.error('   Hint: Did you run the fix_dashboard.sql script?');
    } else {
        console.log('✅ Insert Success. ID:', insertData.id);
    }

    // 2. Try to SELECT (Read)
    const { data: readData, error: readError } = await supabase
        .from('dashboard_activities')
        .select('*')
        .limit(5);

    if (readError) {
        console.error('❌ Read Failed:', readError.message);
    } else {
        console.log(`✅ Read Success. Found ${readData.length} rows.`);
        readData.forEach(row => {
            console.log(`   - [${row.action_type}] ${row.description}`);
        });
    }
}

verifyNotifications();
