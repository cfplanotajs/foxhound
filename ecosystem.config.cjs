module.exports = {
  apps: [
    {
      name: "foxhound-web",
      script: "npm",
      args: "run start",
      cwd: ".",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "foxhound-worker",
      script: "npm",
      args: "run worker",
      cwd: ".",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
