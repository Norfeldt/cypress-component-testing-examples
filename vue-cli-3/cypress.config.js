const { defineConfig } = require('cypress')
const { startDevServer } = require('@cypress/webpack-dev-server')
const webpackConfig = require('@vue/cli-service/webpack.config')

module.exports = defineConfig({
  component: {
    devServer(cypressDevServerConfig) {
      return startDevServer({
        options: cypressDevServerConfig,
        webpackConfig,
      })
    },
    componentFolder: 'src',
    testFiles: '**/*.spec.ct.js'
  }
})