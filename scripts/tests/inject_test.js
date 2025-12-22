const { createClient } = require('@supabase/supabase-js');

// Load env vars
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
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function injectTestNotification() {
    console.log('Sending Test Notification...');
    const now = new Date().toLocaleTimeString();

    const { error } = await supabase
        .from('dashboard_activities')
        .insert({
            action_type: 'SYSTEM',
            description: `Test Notification at ${now} - Please confirm if you see this!`,
            actor_name: 'Antigravity AI',
            actor_email: 'ai@test.com',
            read: false
        });

    if (error) console.error('Error:', error);
    else console.log('✅ Notification Sent!');
}

injectTestNotification();
