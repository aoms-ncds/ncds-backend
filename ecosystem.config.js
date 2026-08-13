module.exports = {
  apps: [{
    name: 'ncds-server',
    script: './dist/bundle.js', // <-- confirm this matches your actual entry file
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      PORT: 8002,
    },
  }],
};
