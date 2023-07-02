const fs = require('fs')
const path = require('path')

exports.index = async (req, res) => {
  // Set the data directory
  const dataDir = path.join(__dirname, '../../../data')
  // If it doesn't exist then redirect to the main page
  if (!fs.existsSync(dataDir)) return res.redirect('/')
  // Set the projects file
  const projectsFile = path.join(dataDir, 'projects.json')
  // If it doesn't exist then redirect to the main page
  if (!fs.existsSync(projectsFile)) return res.redirect('/')
  // Load the contents of the projects file
  const projectsJSON = JSON.parse(fs.readFileSync(projectsFile, 'utf-8'))
  // Check to see if the projectName doesn't exist in the projects file, if it doesn't then redirect to the main page
  if (!projectsJSON[req.params.projectName]) return res.redirect('/')
  // Load the project data into the template values
  const project = projectsJSON[req.params.projectName]

  // Check to see if we have been 'POST'ed to
  if (req.method === 'POST') {
    // If we're just updating the information, do that here
    if (req.body.action === 'update') {
      // Check to see if we have an appData.json file, if so load it up
      let appData = {}
      const appDataFile = path.join(dataDir, 'appData.json')
      if (fs.existsSync(appDataFile)) appData = JSON.parse(fs.readFileSync(appDataFile, 'utf-8'))

      // If we've been passed the localDirectory then update the project object
      if (req.body.localDirectory) project.localDirectory = req.body.localDirectory
      // If we've been passed 'platform' and it's not 'Select platform' then update the project object
      if (req.body.platform && req.body.platform !== 'Select platform') project.platform = req.body.platform
      // If we have a projectId then update the project object
      if (req.body.projectId) project.projectId = req.body.projectId
      // If we have a projectDir record it, this is where it lives on revdancatt.com
      if (req.body.projectDir) {
        project.projectDir = req.body.projectDir
        // If we have the revdancattdotcom root directory in the appData then make sure we have the projectDir in there
        // along with the image folders it needs
        if (appData.revdancattRootDir) {
          const projectDir = path.join(appData.revdancattRootDir, 'app/public/imgs/projects', project.projectDir)
          if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir)
          // Make sure the highres, slides and thumbnails folders exist
          const highresDir = path.join(projectDir, 'highres')
          if (!fs.existsSync(highresDir)) fs.mkdirSync(highresDir)
          const slidesDir = path.join(projectDir, 'slides')
          if (!fs.existsSync(slidesDir)) fs.mkdirSync(slidesDir)
          const thumbnailsDir = path.join(projectDir, 'thumbnails')
          if (!fs.existsSync(thumbnailsDir)) fs.mkdirSync(thumbnailsDir)
        }
      }
      // Save the project object back to the projects file
      projectsJSON[req.params.projectName] = project
      // Write the projects file back to disk
      fs.writeFileSync(projectsFile, JSON.stringify(projectsJSON, null, 2), 'utf-8')
      // Redirect to the project page
      return res.redirect(`/project/${req.params.projectName}`)
    }

    // If we're trying to update the API, then do that
    if (req.body.action === 'fetchAPI') {
      // If the project is fxhash 1.0 or fxhash 2.0 then we call the API like this
      if (project.platform === 'fxhash 1.0' || project.platform === 'fxhash 2.0') {
        // Add some code in a moment to go fetch the API and update the project object
        const { default: nodeFetch } = await import('node-fetch')
        const query = `
        query {
          generativeToken(id:${project.projectId}) {
            id
            name
            slug
            createdAt
            displayUri
            generativeUri
            objktsCount
            metadata
            pricingDutchAuction {
              decrementDuration
              finalPrice
              levels
              opensAt
              restingPrice
            }
            pricingFixed {
              opensAt
              price
            }
            paramsDefinition
            features
            entireCollection {
              id
              name
              slug
              createdAt
              generationHash
              mintedPrice
              minter {
                id
                name
              }
              features
            }
          }
        }`
        // When we make the first call we'll get back a count of how many objkts there are, we can use this to work out how many times we need to call the API
        const apiCall = await nodeFetch('https://api.fxhash.xyz/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        })
        const apiResponse = await apiCall.json()
        // If there isn't an api node in the project object then create it
        if (!project.api) project.api = {}
        // Set the lastUpdated value
        project.api.lastUpdated = new Date().getTime()
        // Put the collection into an api collection node, then delete it from the main data node
        project.api.collection = apiResponse.data.generativeToken.entireCollection
        delete apiResponse.data.generativeToken.entireCollection
        // Now put the features into an api features node, then delete it from the main data node
        project.api.features = apiResponse.data.generativeToken.features
        delete apiResponse.data.generativeToken.features
        // Put the rest of the data into the api data node
        project.api.data = apiResponse.data.generativeToken
        // Save the project object back to the projects file
        projectsJSON[req.params.projectName] = project
        // Write the projects file back to disk
        fs.writeFileSync(projectsFile, JSON.stringify(projectsJSON, null, 2), 'utf-8')
      }
      // Redirect to the project page
      return res.redirect(`/project/${req.params.projectName}`)
    }
  }

  // Add the project name to the project objects
  project.name = req.params.projectName

  // Work out the url to the project page on the platform
  if (project.platform === 'fxhash 1.0') project.url = `https://fxhash.xyz/generative/${project.projectId}`

  // If we have a localDirectory and it exists then do local directory stuff
  if (project.localDirectory && fs.existsSync(project.localDirectory)) {
    // Go look to see if we have a git directory so we can pull the url to github from it
    const gitDir = path.join(project.localDirectory, '.git')
    // If it exists then load the contents of the config file
    if (fs.existsSync(gitDir)) {
      // Set the config file
      const configFile = path.join(gitDir, 'config')
      // If it exists then load the contents of the config file
      if (fs.existsSync(configFile)) {
        // Load the contents of the config file
        const configFileContents = fs.readFileSync(configFile, 'utf-8')
        // Split the config file contents into lines
        const configFileLines = configFileContents.split('\n')
        // Loop through the lines
        for (let i = 0; i < configFileLines.length; i++) {
          // If we find the url line then split it on the = sign
          if (configFileLines[i].indexOf('url = ') !== -1) {
            const url = configFileLines[i].split('=')[1].trim()
            // If the url starts with git@ then replace it with https://
            if (url.indexOf('git@') === 0) project.githubUrl = url.replace('git@', 'https://')
            // If the url starts with https:// then set it
            if (url.indexOf('https://') === 0) project.githubUrl = url
            // Strip the .git off the end of the url
            project.githubUrl = project.githubUrl.replace('.git', '')
            // Remove the username@ from the url
            project.githubUrl = project.githubUrl.replace(/.*@/, '')
            // Add https:// back to the url
            project.githubUrl = `https://${project.githubUrl}`
          }
        }
      }
    }

    // If we are an fxhash project, then I want to check to see if I need to update the source code, we're going
    // to do a bunch of check here, first we're going to look to see if an index.html file exists and if it has
    // an fxhash script node in it.
    if (project.platform === 'fxhash 1.0' || project.platform === 'fxhash 2.0') {
      // Check to see if the index.html file exists
      const indexFile = path.join(project.localDirectory, 'index.html')
      project.indexFileExists = fs.existsSync(indexFile)
      if (project.indexFileExists) {
        // Read in the contents of the index.html file, remove all the tabs and spaces
        const indexFileContents = fs.readFileSync(indexFile, 'utf-8').replace(/\t/g, '').replace(/\n/g, '').replace(/\s/g, '')
        // Check to see if the index.html file has an fxhash script node in it, by searching for '<script id="fxhash-snippet">'
        project.indexFileHasFxhashScriptNode = indexFileContents.indexOf('<scriptid="fxhash-snippet">') !== -1
        // If it does we need to check to see if the contents of the fxhash script node match the contents of the fxhash script file
        // in the codeFragments directory
        if (project.indexFileHasFxhashScriptNode) {
          // Grab everything from the fxhash script node to the closing script node, including the closing script node
          const fxhashScriptNode = indexFileContents.substring(indexFileContents.indexOf('<scriptid="fxhash-snippet">'), indexFileContents.indexOf('</script>', indexFileContents.indexOf('<script id="fxhash-snippet">')) + 9)
          // Read in the contents of the fxhash script file
          let fxhashScriptFile = path.join(__dirname, '../../../codeFragments/fxhash-v1-snippet.html')
          if (project.platform === 'fxhash 2.0') fxhashScriptFile = path.join(__dirname, '../../../codeFragments/fxhash-v2-snippet.html')
          const fxhashScriptFileContents = fs.readFileSync(fxhashScriptFile, 'utf-8').replace(/\t/g, '').replace(/\n/g, '').replace(/\s/g, '')
          // If the contents of the fxhash script node don't match the contents of the fxhash script file then we need to set that flag
          project.indexFileFxhashScriptNodeMatches = fxhashScriptNode === fxhashScriptFileContents
        }
      }
    }
  }

  // Add the project to the template values
  req.templateValues.project = project

  return res.render('project/index', req.templateValues)
}
