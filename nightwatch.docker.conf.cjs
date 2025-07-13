module.exports = {
  src_folders: ['tests/E2E'],
  output_folder: 'tests_output',
  
  selenium: {
    start_process: false,
    host: process.env.SELENIUM_HOST || 'localhost',
    port: 4444,
  },

  test_settings: {
    default: {
      selenium_host: process.env.SELENIUM_HOST || 'localhost',
      selenium_port: 4444,
      launch_url: process.env.BASE_URL || 'http://localhost:3000',
      
      desiredCapabilities: {
        browserName: 'firefox',
        acceptSslCerts: true,
        acceptInsecureCerts: true,
        'moz:firefoxOptions': {
          args: [
            '--headless',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--allow-running-insecure-content'
          ],
          prefs: {
            'dom.webnotifications.enabled': false,
            'dom.push.enabled': false
          }
        }
      },
      
      screenshots: {
        enabled: true,
        on_failure: true,
        on_error: true,
        path: 'tests_output/screenshots'
      },
      
      videos: {
        enabled: false
      },
      
      globals: {
        waitForConditionTimeout: 10000,
        waitForConditionPollInterval: 500,
        retryAssertionTimeout: 5000
      }
    }
  }
};