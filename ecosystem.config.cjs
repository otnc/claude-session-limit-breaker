module.exports = {
  apps: [
    {
      name: "claude-session-limit-breaker",
      script: "node_modules/purus/bin/purus.js",
      args: "run src/main.purus",
      interpreter: "node",
      cwd: __dirname,
      autorestart: true,
      watch: false,
    },
  ],
};
