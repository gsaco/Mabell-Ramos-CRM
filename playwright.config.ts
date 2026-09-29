import {defineConfig, devices} from '@playwright/test';

export default defineConfig({
  testDir:'./tests',
  testMatch:'ui.spec.ts',
  fullyParallel:false,
  workers:1,
  timeout:45_000,
  expect:{timeout:8_000},
  reporter:[['list'],['html',{open:'never'}]],
  use:{baseURL:'http://127.0.0.1:4183',timezoneId:'America/Lima',trace:'retain-on-failure',screenshot:'only-on-failure',launchOptions:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:undefined},
  projects:[
    {name:'escritorio',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:1000}}},
    {name:'movil',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}},
  ],
  webServer:{command:'npm run build && npm run preview -- --port 4183 --strictPort',url:'http://127.0.0.1:4183',reuseExistingServer:true,timeout:120_000},
});
