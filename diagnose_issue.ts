
import { createConnection } from 'typeorm';
import { User } from './backend/src/users/user.entity';
import { StaffProfile } from './backend/src/staff/staff-profile.entity';
import { Certificate } from './backend/src/certificates/certificate.entity';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

async function diagnose() {
    try {
        console.log("Starting diagnostics...");

        // 1. Check Puppeteer
        try {
            const puppeteer = await import('puppeteer');
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            await browser.close();
            console.log("✅ Puppeteer launch successful");
        } catch (err) {
            console.error("❌ Puppeteer launch failed:", err.message);
        }

        // 2. Check Data (Only if we can connect to DB)
        // This requires installing ts-node and dependencies which might be slow.
        // Let's just check file existence of template first.

        const templatePath = path.join(__dirname, 'backend', 'src', 'templates', 'certificate.html');
        if (require('fs').existsSync(templatePath)) {
            console.log("✅ Template found at:", templatePath);
        } else {
            console.error("❌ Template NOT found at:", templatePath);
        }

    } catch (err) {
        console.error("Diagnostic error:", err);
    }
}

diagnose();
