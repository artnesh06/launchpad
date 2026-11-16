module.exports = {
  apps: [
    {
      name: 'nft-launchpad-web',
      script: 'pnpm',
      args: 'start',
      cwd: '/app',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      error_file: './logs/web-err.log',
      out_file: './logs/web-out.log',
      log_file: './logs/web-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};