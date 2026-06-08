/** @type {import('pm2').StartOptions} */
module.exports = {
  apps: [
    {
      name: "voice-toys",
      cwd: "/var/www/voice-toys",
      script: "bun",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        PATH: "/root/.bun/bin:/usr/local/bin:/usr/bin:/bin",
      },
      max_memory_restart: "512M",
      autorestart: true,
      watch: false,
    },
  ],
};
