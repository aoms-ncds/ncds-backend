module.exports = {
  apps: [{
    name: 'ncds-app',
    script: './server.js', // <-- change to your actual entry file
    instances: 'max', // uses all available cores
    exec_mode: 'cluster',
    port: 8003,
  }],
};
