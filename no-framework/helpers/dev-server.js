const path = require('path')
const express = require('express')
const webpack = require('webpack')
const { createFsFromVolume, Volume } = require('memfs')

// It would be nice if this could be imported from @cypress/mount-utils
const ROOT_ID = '__cy_root'

// Is there a better way to get the port?
const PORT = 9000

// HTML that the Cypress test runner expects for the Component Test AUT Frame
const getAUTFrameHtml = ({ projectRoot }) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <title>AUT Frame</title>
  </head>
  <body>
    <div id="${ROOT_ID}"></div>
    <script type="module">
      const projectRoot = "${projectRoot}"
      const specPath = location.href.substring(location.href.indexOf(projectRoot) + projectRoot.length)
      const importsToLoad = [() => import(specPath)]
      const CypressInstance = window.Cypress = parent.Cypress
      CypressInstance.onSpecWindow(window, importsToLoad)
      CypressInstance.action('app:window:before:load', window)
    </script>
  </body>
</html>
`

// Get AUT HTML and send as response
const sendHtml = (config) => (req, res) => {
  res.send(getAUTFrameHtml(config))
}

// Compile spec file (including any js/css imports) into a bundle in memory,
// and return a promise that resolves with the bundle contents or rejects
// with an error message
const compileSpec = (projectRoot, specPath) => {
  const fs = createFsFromVolume(new Volume())
  const compiler = webpack({
    mode: 'development',
    context: projectRoot,
    entry: specPath,
    output: { filename: specPath.substring(1) },
    module: {
      rules: [
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
  })
  compiler.outputFileSystem = fs
  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        console.error(err)
        reject(err.message)
      } else if (stats.hasErrors()) {
        const info = stats.toJson()
        console.error(info.errors[0].details)
        reject(info.errors[0].message)
      } else {
        console.log(stats.toString({ chunks: false, colors: true }))
        const content = fs.readFileSync(`dist${specPath}`)
        resolve(content.toString())
      }
    })
  })
}

// Process spec file and send bundle as response
const sendSpecBundle =
  ({ projectRoot }) =>
  (req, res) => {
    compileSpec(projectRoot, req.path)
      .then((generatedScript) => {
        res.setHeader('Content-Type', 'text/javascript')
        res.send(generatedScript)
      })
      .catch((errMessage) => {
        res.status(500).send(errMessage)
      })
  }

// Start the dev server
const startDevServer = (port, config) => {
  const app = express()
  // Serve HTML file that the AUT frame loads initially
  app.get('/__cypress/src/index.html', sendHtml(config))
  // Serve spec files, processed into a bundle
  app.get('*', sendSpecBundle(config))
  // Start server
  return app.listen(port)
}

// Inject Cypress dev server
const injectDevServer = (on, config) => {
  on('dev-server:start', async (options) => {
    const server = startDevServer(PORT, config)
    return { port: PORT, close: server.close }
  })
}

module.exports = { injectDevServer }

// For testing purposes, if this script is run directly via node, start
// a standalone dev server
if (require.main === module) {
  const projectRoot = path.join(__dirname, '..')
  startDevServer(PORT, { projectRoot })
}