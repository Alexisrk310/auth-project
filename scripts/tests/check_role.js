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

async function checkUserRole() {
    console.log('--- Checking User Role for alexisrk310@gmail.com ---');

    // 1. Get User ID from Auth (optional, hard to do without session, but we can search profiles by email if we stored it?)
    // Actually profiles table usually has id, full_name, role. It MIGHT have email if we added it, or we rely on auth.users link.
    // Let's check profiles table structure.

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*');

    if (error) {
        console.error('Error fetching profiles:', error);
        return;
    }

    console.log(`Found ${profiles.length} profiles.`);
    profiles.forEach(p => {
        // We often can't see email in profiles unless we put it there. 
        // But we can guess by ID or just see if ANYONE is owner.
        console.log(`- ID: ${p.id}, Role: ${p.role}, Name: ${p.full_name}, Email: ${p.email || 'N/A'}`);
    });
}

checkUserRole();
