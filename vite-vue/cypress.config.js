const { defineConfig } = require("cypress");
const { startDevServer } = require("@cypress/vite-dev-server");

module.exports = defineConfig({
  component: {
    devServer(cypressDevServerConfig) {
      return startDevServer({
        options: cypressDevServerConfig,
      });
    },
    specPattern: "src/**/*.cy.{js,jsx,ts,tsx}",
  },
});
