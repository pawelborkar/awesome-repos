import {defineConfig,devices} from '@playwright/test';
import {existsSync} from 'node:fs';
const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export default defineConfig({testDir:'tests/browser',fullyParallel:false,workers:1,reporter:[['list'],['html',{open:'never'}]],use:{baseURL:'http://127.0.0.1:4937',launchOptions:existsSync(chrome)?{executablePath:chrome}:{}},webServer:{command:'node scripts/serve.mjs',url:'http://127.0.0.1:4937',reuseExistingServer:false},projects:[{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}}]});
