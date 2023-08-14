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

  let appData = {}
  const appDataFile = path.join(dataDir, 'appData.json')
  if (fs.existsSync(appDataFile)) appData = JSON.parse(fs.readFileSync(appDataFile, 'utf-8'))

  // Check to see if we have been 'POST'ed to
  if (req.method === 'POST') {
    // If we're just updating the information, do that here
    if (req.body.action === 'update') {
      // Check to see if we have an appData.json file, if so load it up

      // If we've been passed the localDirectory then update the project object
      if (req.body.localDirectory) project.localDirectory = req.body.localDirectory
      // If we've been passed 'platform' and it's not 'Select platform' then update the project object
      if (req.body.platform && req.body.platform !== 'Select platform') project.platform = req.body.platform
      // If we've been passed a 'blockchain' then update the project object
      if (req.body.blockchain && req.body.blockchain !== 'Select blockchain') project.blockchain = req.body.blockchain
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

    // If we are creating a collage then redirect to the collage page
    if (req.body.action === 'collage') {
      // Redirect to the collage page
      return res.redirect(`/project/${req.params.projectName}/collage`)
    }
  }

  // Add the project name to the project objects
  project.name = req.params.projectName

  // Work out the url to the project page on the platform
  if (project.platform === 'fxhash 1.0') project.url = `https://fxhash.xyz/generative/${project.projectId}`
  if (project.platform === 'fxhash 2.0') project.url = `https://fxhash.xyz/generative/${project.projectId}`

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

    // This will load in the index.html file, it shouldn't matter what the platform is for this bit because we have
    // common code that works across all platforms
    const indexFile = path.join(project.localDirectory, 'index.html')
    project.indexFileExists = fs.existsSync(indexFile)
    let indexFileContents = ''
    if (project.indexFileExists) indexFileContents = fs.readFileSync(indexFile, 'utf-8').replace(/\t/g, '').replace(/\n/g, '').replace(/\s/g, '')

    // If we are an fxhash project, then I want to check to see if I need to update the source code, we're going
    // to do a bunch of check here, first we're going to look to see if an index.html file exists and if it has
    // an fxhash script node in it.
    if (project.platform === 'fxhash 1.0' || project.platform === 'fxhash 2.0') {
      // Check to see if the index.html file exists
      if (project.indexFileExists) {
        // Read in the contents of the index.html file, remove all the tabs and spaces
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

    // This will check the index.js file for certain things we need
    const jsFile = path.join(project.localDirectory, 'index.js')
    project.jsFileExists = fs.existsSync(jsFile)
    let jsFileContents = ''
    if (project.jsFileExists) jsFileContents = fs.readFileSync(jsFile, 'utf-8')
    // Check to see if "'forceWidth'" and "'forceDownload'" are in the index.js file
    project.hasForceWidth = jsFileContents.indexOf('forceWidth') !== -1
    project.hasForceDownload = jsFileContents.indexOf('forceDownload') !== -1
    project.hasForceId = jsFileContents.indexOf('forceId') !== -1
  }

  // We want to grab all the hashes and ids from the project and put them into an array
  // how we do this depends on the platform
  const mints = []
  let indexOffset = 0
  if (project.platform === 'fxhash 1.0' || project.platform === 'fxhash 2.0') {
    indexOffset = 1
    // If we have an api node in the project object then we want to use that
    if (project.api) {
      // Loop through the collection and add the id and hash to the mints array
      // because we are on fxhash the id is the same as the index + indexOffset
      for (let i = 0; i < project.api.collection.length; i++) {
        mints.push({
          id: i + indexOffset,
          hash: project.api.collection[i].generationHash
        })
      }
    }
  }
  project.mints = mints
  project.mintsJSON = JSON.stringify(mints)

  // Do some platform specific stuff
  req.templateValues.platform = {
    isAlba: project.platform === 'Alba',
    isFxhash: project.platform === 'fxhash 1.0' || project.platform === 'fxhash 2.0'
  }
  req.templateValues.canFetchApi = project.platform === 'fxhash 1.0' || project.platform === 'fxhash 2.0'

  // Now we want to construct the dataJSON node that would be used on
  // the revdancatt.com site. This needs to be generated from here
  // as much as possible, if not then we see if we can read it from
  // there. Finally we try and grab it from the API
  let revdancattProjectJSON = {}
  req.templateValues.hasRevdancattProjectData = false
  // Look in the data dir of the revdancatt.com site for a projects.json file
  // const revdancattDataDir = path.join(__dirname, '../../../data')
  if (appData.revdancattRootDir) {
    const revdancattProjectFile = path.join(appData.revdancattRootDir, 'data', 'projects.json')
    if (fs.existsSync(revdancattProjectFile)) {
      // Load the contents of the projects file
      const revdancattProjects = JSON.parse(fs.readFileSync(revdancattProjectFile, 'utf-8'))
      // Loop through the projects
      // TODO: Grab the project
      for (const revdancattProject of revdancattProjects) {
        if (revdancattProject.title === req.params.projectName) {
          // We have a match, so set the revdancattProjectJSON to this project
          revdancattProjectJSON = revdancattProject
        }
      }
    }
  }

  // Set the default values for the new revdancatt project JSON
  const newRevdancattProjectJSON = {
    title: null,
    prefix: null,
    directory: null,
    projectSource: null,
    platformUrl: null,
    platformName: null,
    projectType: null,
    projectId: null,
    blockchain: null,
    currency: null,
    currencySymbol: null,
    currencyMod: null,
    size: null,
    jumpSize: 100,
    type: 'Long-Form Generative Art',
    releaseDate: null,
    ratio: null,
    description: null
  }
  // Now deconstruct the revdancattProjectJSON into newRevdancattProjectJSON,
  // overwriting anything there already but not removing anything that isn't
  // in the newRevdancattProjectJSON
  Object.assign(newRevdancattProjectJSON, revdancattProjectJSON)

  // Go grab the directory if we have it
  if (project.projectDir) newRevdancattProjectJSON.directory = project.projectDir
  // If we have a url link to the platform then use that
  if (project.url) newRevdancattProjectJSON.platformUrl = project.url

  // Now we need to grab data we know from the api and put it into the newRevdancattProjectJSON
  if (project.api && project.api.data) {
    newRevdancattProjectJSON.title = project.api.data.name
    if (req.templateValues.platform.isFxhash) {
      newRevdancattProjectJSON.projectSource = 'fxhash'
      newRevdancattProjectJSON.platformName = 'fx(hash)'
      newRevdancattProjectJSON.projectType = 'v1'
      // TODO: Work out if the project has params
      newRevdancattProjectJSON.projectId = project.projectId

      // If there's a collection node then we want to grab the release date from the first item in the collection
      if (project.api.collection) {
        // Display the release date in MMM, YYYY format
        const releaseDate = new Date(project.api.collection[0].createdAt)
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'Novermber', 'December']
        newRevdancattProjectJSON.releaseDate = `${monthNames[releaseDate.getMonth()]}, ${releaseDate.getFullYear()}`
      }
    }
  }
  // Now grab some other things from the project object
  if (project.blockchain) {
    newRevdancattProjectJSON.blockchain = project.blockchain
    if (project.blockchain === 'Ethereum') {
      newRevdancattProjectJSON.currency = 'eth'
      newRevdancattProjectJSON.currencySymbol = 'Ξ'
      newRevdancattProjectJSON.currencyMod = 1000000000000000000
    }
    if (project.blockchain === 'Tezos') {
      newRevdancattProjectJSON.currency = 'xtz'
      newRevdancattProjectJSON.currencySymbol = 'ꜩ'
      newRevdancattProjectJSON.currencyMod = 1000000
    }
    // TODO: Sort out Alba
  }
  // Set the size, we need a nicely formatted number with commas, based on the mint length
  newRevdancattProjectJSON.size = `${project.mints.length.toLocaleString()} Unique Editions`

  if (req.method === 'POST' && req.body.action && req.body.action === 'updateRevdancatt') {
    newRevdancattProjectJSON.prefix = req.body.prefix
    newRevdancattProjectJSON.ratio = req.body.ratio
    newRevdancattProjectJSON.description = req.body.description
    //   If we have a projects.json file in revdancatt then we need to load it in
    if (appData.revdancattRootDir) {
      const revdancattProjectFile = path.join(appData.revdancattRootDir, 'data', 'projects.json')
      let revdancattProjects = []
      // If the file exists then load it in
      if (fs.existsSync(revdancattProjectFile)) {
        // Load the contents of the projects file
        revdancattProjects = JSON.parse(fs.readFileSync(revdancattProjectFile, 'utf-8'))
        // Loop through the projects
        // TODO: Grab the project
        let foundMatch = null
        let projectIndex = 0
        for (const revdancattProject of revdancattProjects) {
          console.log(revdancattProject.directory, newRevdancattProjectJSON.directory)
          if (revdancattProject.directory === newRevdancattProjectJSON.directory) {
            foundMatch = projectIndex
          }
          projectIndex++
        }
        console.log('foundMatch: ', foundMatch)
        // If we didn't find a match, then we need to add the new project to the projects array
        if (!foundMatch) {
          revdancattProjects.push(newRevdancattProjectJSON)
        } else {
          // Otherwise we want to update the project in the projects array
          revdancattProjects[foundMatch] = newRevdancattProjectJSON
        }
      } else {
        // Otherwise we push it into the projects array
        revdancattProjects.push(newRevdancattProjectJSON)
      }
      // Now write the projects file back to disk
      fs.writeFileSync(revdancattProjectFile, JSON.stringify(revdancattProjects, null, 2), 'utf-8')
    }
    return res.redirect(`/project/${req.params.projectName}`)
  }
  req.templateValues.newRevdancattProjectJSON = newRevdancattProjectJSON

  // Check to see if we have mints file for the project
  req.templateValues.hasMintsData = false
  // If we are an fxhash project then we need to check in the fxhash directory
  let mintsDirectory = null
  let mintsJSONFile = null
  if (project.platform === 'fxhash 1.0' || project.platform === 'fxhash 2.0') {
    mintsDirectory = path.join(appData.revdancattRootDir, 'data', 'projects', 'fxhash')
    mintsJSONFile = path.join(mintsDirectory, `${project.projectId}.json`)
    if (fs.existsSync(mintsJSONFile)) req.templateValues.hasMintsData = true
  }

  // Now we want to check if we have highres images for the project
  req.templateValues.hasHighres = true
  req.templateValues.hasSlides = true
  req.templateValues.hasThumbnails = true

  // Check to see if we have any images in the downloads folder
  req.templateValues.hasImagesInDownloadsFolder = true

  // Grab the contents of the highres folder for the project from the revdancatt site
  let highresFiles = []
  const highresDir = path.join(appData.revdancattRootDir, 'app', 'public', 'imgs', 'projects', project.projectDir, 'highres')
  if (fs.existsSync(highresDir)) highresFiles = fs.readdirSync(highresDir).filter(file => file.indexOf('.jpg') !== -1)
  // Do the same again for the thumbnails
  let thumbnailsFiles = []
  const thumbnailsDir = path.join(appData.revdancattRootDir, 'app', 'public', 'imgs', 'projects', project.projectDir, 'thumbnails')
  if (fs.existsSync(thumbnailsDir)) thumbnailsFiles = fs.readdirSync(thumbnailsDir).filter(file => file.indexOf('.jpg') !== -1)
  // And again for the downloads folder, but we use .png this time, and grab the downloads folder from the appData
  let downloadsFiles = []
  const downloadsDir = path.join(appData.downloadsRootDir)
  if (fs.existsSync(downloadsDir)) downloadsFiles = fs.readdirSync(downloadsDir).filter(file => file.indexOf('.png') !== -1)
  // Finally we are going to see if there are _ANY_ files in the slides folder
  let slidesFiles = []
  const slidesDir = path.join(appData.revdancattRootDir, 'app', 'public', 'imgs', 'projects', project.projectDir, 'slides')
  if (fs.existsSync(slidesDir)) slidesFiles = fs.readdirSync(slidesDir).filter(file => file.indexOf('.jpg') !== -1)
  if (slidesFiles.length === 0) req.templateValues.hasSlides = false
  req.templateValues.slides = slidesFiles

  // Do a loop over the total number of mints
  const imageFilenames = []
  for (let i = 0; i < project.mints.length; i++) {
    const thisIndex = i + indexOffset
    let thisFilename = `${newRevdancattProjectJSON.prefix}_${thisIndex.toString().padStart(4, '0')}_`
    // If we are on fxhash, then we need to look in the api collections node to grab the generated hash
    if (project.platform === 'fxhash 1.0' || project.platform === 'fxhash 2.0') {
      // If we have an api node in the project object then we want to use that
      if (project.api && project.api.collection) {
        // Grab the hash from the collections based on i
        const thisHash = project.api.collection[i].generationHash
        // Add it to the filename
        thisFilename += thisHash
        // See if this filename exists in the highresFiles array, if not then set the hasHighres flag to false
        if (highresFiles.indexOf(`${thisFilename}.jpg`) === -1) req.templateValues.hasHighres = false
        // See if this filename exists in the thumbnailsFiles array, if not then set the hasThumbnails flag to false
        if (thumbnailsFiles.indexOf(`${thisFilename}.jpg`) === -1) req.templateValues.hasThumbnails = false
        // See if this filename exists in the downloadsFiles array, if not then set the hasImagesInDownloadsFolder flag to false
        if (downloadsFiles.indexOf(`${thisFilename}.png`) === -1) req.templateValues.hasImagesInDownloadsFolder = false
      }
      imageFilenames.push(thisFilename)
    }
  }

  // Now we need to check to see if we've been told to create the mints JSON or images
  if (req.method === 'POST' && req.body.JSONandImageActions) {
    // Grab the size of the first image in the downloads folder
    const {
      createCanvas,
      loadImage
    } = require('canvas')
    const sizeOf = require('image-size')
    const firstImage = path.join(downloadsDir, `${imageFilenames[0]}.png`)
    let dimensions = null
    if (fs.existsSync(firstImage)) {
      req.templateValues.hasImagesInDownloadsFolder = true
      dimensions = sizeOf(firstImage)
    }

    if (req.body.JSONandImageActions === 'updateMintJSON') {
      // We need to grab the JSON file for the project that holds all the mints, and then split it up into
      // a separate JSON file for each mint
      // First grab all the mints, this is different depending on the platform
      let mints = []
      if (project.platform === 'fxhash 1.0' || project.platform === 'fxhash 2.0') {
        mints = project.api.collection
        // Now we need to save those mints into the fxhash directory in the data
        // folder over in revdancatt.com
        fs.writeFileSync(mintsJSONFile, JSON.stringify(mints, null, 2))
      }
    }

    if (req.body.JSONandImageActions === 'updateHighres') {
      // We need to go through each of the downloads file and convert them into highres jpg files, do the each loop first
      for (const sourceImage of imageFilenames) {
        const sourceFilename = `${sourceImage}.png`
        const sourceFile = path.join(downloadsDir, sourceFilename)
        const targetFilename = `${sourceImage}.jpg`
        const targetFile = path.join(highresDir, targetFilename)
        // Only do this if the sourceFile exists
        if (fs.existsSync(sourceFile)) {
          console.log(sourceFile)
          // Create a new canvas based on the width and height
          const canvas = createCanvas(dimensions.width, dimensions.height)
          const ctx = canvas.getContext('2d')
          const image = await loadImage(sourceFile)
          ctx.drawImage(image, 0, 0)
          const out = fs.createWriteStream(targetFile)
          // Create a stream to write the jpg to
          const stream = canvas.createJPEGStream()
          // Stream it out but in a way where we can use await
          await new Promise((resolve, reject) => {
            stream.pipe(out)
            out.on('finish', resolve)
            out.on('error', reject)
          })
        }
      }
    }

    if (req.body.JSONandImageActions === 'updateThumbnails') {
      let targetWidth = 1280
      let targetHeight = targetWidth / dimensions.width * dimensions.height
      // If the targetWidth is greater than the dimensions.width then we need to flip it
      if (targetWidth > dimensions.width) {
        targetHeight = 1280
        targetWidth = targetHeight / dimensions.height * dimensions.width
      }
      // We need to go through each of the downloads file and convert them into highres jpg files, do the each loop first
      for (const sourceImage of imageFilenames) {
        const sourceFilename = `${sourceImage}.png`
        const sourceFile = path.join(downloadsDir, sourceFilename)
        const targetFilename = `${sourceImage}.jpg`
        const targetFile = path.join(thumbnailsDir, targetFilename)
        // Only do this if the sourceFile exists
        if (fs.existsSync(sourceFile)) {
          console.log(sourceFile)
          // Create a new canvas based on the width and height
          const canvas = createCanvas(targetWidth, targetHeight)
          const ctx = canvas.getContext('2d')
          const image = await loadImage(sourceFile)
          ctx.drawImage(image, 0, 0, targetWidth, targetHeight)
          const out = fs.createWriteStream(targetFile)
          // Create a stream to write the jpg to
          const stream = canvas.createJPEGStream()
          // Stream it out but in a way where we can use await
          await new Promise((resolve, reject) => {
            stream.pipe(out)
            out.on('finish', resolve)
            out.on('error', reject)
          })
        }
      }
    }

    if (req.body.JSONandImageActions === 'updateSlides') {
      const minSlideWidth = 1600
      const minSlideHeight = 2250
      const slideRatio = minSlideWidth / minSlideHeight
      // Delete the contents of the slides directory
      fs.readdirSync(slidesDir).forEach(file => {
        const filePath = path.join(slidesDir, file)
        fs.unlinkSync(filePath)
      })
      // Also make a slides folder in our own plublic folder so we can show them
      const localSlidesFolder = path.join(__dirname, '../../public/slides')
      // If it doesn't exist then create it
      if (!fs.existsSync(localSlidesFolder)) fs.mkdirSync(localSlidesFolder)
      // Now the local slides project folder for this project based on the prefix
      const localSlidesProjectFolder = path.join(localSlidesFolder, newRevdancattProjectJSON.prefix)
      // If it doesn't exist then create it
      if (!fs.existsSync(localSlidesProjectFolder)) fs.mkdirSync(localSlidesProjectFolder)
      // Now delete all the files in the localSlidesProjectFolder
      fs.readdirSync(localSlidesProjectFolder).forEach(file => {
        const filePath = path.join(localSlidesProjectFolder, file)
        fs.unlinkSync(filePath)
      })

      // Make a deep copy of the filenames array
      const imageFilenamesCopy = JSON.parse(JSON.stringify(imageFilenames))
      // Now shuffle it, properly, here without using a function
      for (let i = imageFilenamesCopy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const temp = imageFilenamesCopy[i]
        imageFilenamesCopy[i] = imageFilenamesCopy[j]
        imageFilenamesCopy[j] = temp
      }

      // Now we are going to make five new slides
      for (let i = 0; i < 6; i++) {
        const sourceFilename = `${imageFilenamesCopy[i]}.png`
        const sourceFile = path.join(downloadsDir, sourceFilename)
        const targetFilename = `${imageFilenamesCopy[i]}.jpg`
        const targetFile = path.join(slidesDir, targetFilename)

        // Work out if the width of the original image times by the slideRatio is greater than the height
        let sourceHeight = null
        let sourceWidth = null
        if (dimensions.width / slideRatio > dimensions.height) {
          // We need to do the calculation based on the height
          // Pick a random height between 2250 and the height of the original image
          sourceHeight = Math.floor(Math.random() * (dimensions.height - minSlideHeight + 1) + minSlideHeight)
          // Work out the width based on the sourceHeight and the slideRatio
          sourceWidth = Math.floor(sourceHeight * slideRatio)
        } else {
          // We can do the calculations based on the width
          // Pick a random width between 1600 and the width of the original image
          sourceWidth = Math.floor(Math.random() * (dimensions.width - minSlideWidth + 1) + minSlideWidth)
          // Work out the height based on the sourceWidth and the slideRatio
          sourceHeight = Math.floor(sourceWidth / slideRatio)
        }
        // Work out where we are going to _take_ from the original image, this is going to be a random x and y
        // based in the original width and height less the source width and height
        const sourceX = Math.floor(Math.random() * (dimensions.width - sourceWidth + 1))
        const sourceY = Math.floor(Math.random() * (dimensions.height - sourceHeight + 1))

        if (fs.existsSync(sourceFile)) {
          console.log(sourceFile)
          const canvas = createCanvas(minSlideWidth, minSlideHeight)
          const ctx = canvas.getContext('2d')
          const image = await loadImage(sourceFile)
          // Draw the image from the sourceX and sourceY, sourceWidth and sourceHeight into the canvas
          ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, minSlideWidth, minSlideHeight)
          const out = fs.createWriteStream(targetFile)
          // Create a stream to write the jpg to
          const stream = canvas.createJPEGStream()
          // Stream it out but in a way where we can use await
          await new Promise((resolve, reject) => {
            stream.pipe(out)
            out.on('finish', resolve)
            out.on('error', reject)
          })
          // Now copy the file to the localSlidesProjectFolder
          const localSlidesProjectFile = path.join(localSlidesProjectFolder, targetFilename)
          fs.copyFileSync(targetFile, localSlidesProjectFile)
        }
      }
    }

    if (req.body.JSONandImageActions === 'cleanDownloads') {
      // Go through all the filenames and delete them from the downloads folder
      for (const sourceImage of imageFilenames) {
        const sourceFilename = `${sourceImage}.png`
        const sourceFile = path.join(downloadsDir, sourceFilename)
        // Only do this if the sourceFile exists
        if (fs.existsSync(sourceFile)) {
          // unlink the file
          fs.unlinkSync(sourceFile)
        }
      }
    }

    // return a reload to the project page
    return res.redirect(`/project/${req.params.projectName}`)
  }

  // Add the project to the template values
  req.templateValues.project = project

  return res.render('project/index', req.templateValues)
}

exports.collage = async (req, res) => {
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

  // Set the project name
  project.name = req.params.projectName

  // Create the default settings for the collage
  const settings = {
    type: 'columns',
    step: null,
    width: 1920,
    columns: 4,
    angle: 0,
    ratio: null,
    offset: false,
    highres: false,
    forceId: null
  }

  // Grab the query string values
  const body = req.body
  // console.log(req.body)
  if (body.type) settings.type = body.type
  if (body.stagger) settings.step = body.stagger
  if (body.width) settings.width = parseInt(body.width)
  if (body.columns) settings.columns = parseInt(body.columns)
  if (body.angle) settings.angle = parseInt(body.angle)
  if (body.ratio) {
    // If there's a ':' in the ratio and then calculate the ratio from that
    if (body.ratio.indexOf(':') !== -1) {
      const ratioParts = body.ratio.split(':')
      settings.ratio = parseFloat(ratioParts[0]) / parseFloat(ratioParts[1])
      settings.displayRatio = `${ratioParts[0]}:${ratioParts[1]}`
    } else {
      settings.ratio = parseFloat(body.ratio)
      settings.displayRatio = body.ratio
    }
  }
  if (body.offset && body.offset === 'true') settings.offset = true
  if (body.highres && body.highres === 'true') settings.highres = true
  if (body.id && body.id !== '') settings.forceId = parseInt(body.id)

  // Go grab the thumbnails for the project based on the projectDir and the appData
  // Load in the appData first
  const appData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../data/appData.json'), 'utf-8'))
  // Make the path to the project directory on revdancatt.com
  let thumbnailDir = path.join(appData.revdancattRootDir, 'app', 'public', 'imgs', 'projects', project.projectDir, 'thumbnails')
  // If we are in highres mode then use the highres directory
  if (settings.highres) thumbnailDir = path.join(appData.revdancattRootDir, 'app', 'public', 'imgs', 'projects', project.projectDir, 'highres')
  // Grab the contents of the directory filtering for .jpg files
  let thumbnails = fs.readdirSync(thumbnailDir).filter(file => file.indexOf('.jpg') !== -1)

  // If we have a forceId then we want to filter the thumbnails to just that one
  if (settings.forceId !== null) {
    // Turn the id into a string padded with 0s
    let paddedId = settings.forceId.toString().padStart(4, '0')
    // Add an underscore to the start and end of the paddedId
    paddedId = `_${paddedId}_`
    // Filter the thumbnails to just the one that matches the paddedId
    thumbnails = thumbnails.filter(file => file.indexOf(paddedId) !== -1)
  }

  // We want to know the dimension of the first image, so we'll grab that then get the image size
  const {
    createCanvas,
    loadImage
  } = require('canvas')
  const sizeOf = require('image-size')
  const firstImage = path.join(thumbnailDir, thumbnails[0])
  const dimensions = sizeOf(firstImage)
  // If the settings.ratio is null, then we want the ratio to be the same as the first image
  if (settings.ratio === null) {
    settings.ratio = dimensions.width / dimensions.height
  }
  // If the ratio is set then we want the height to be based on the width and the ratio
  settings.height = Math.round(settings.width / settings.ratio)

  // Create a new canvas based on the width and height
  const canvas = createCanvas(settings.width, settings.height)
  const ctx = canvas.getContext('2d')
  // Load in the font we are going to use to write on the canvas,
  // it is 'Futura Condensed Medium'
  ctx.font = `${settings.height * 0.02}px Futura`

  // set the collage output directory
  const collageDir = path.join(__dirname, '../../public/collages')
  // If the directory doesn't exist then create it
  if (!fs.existsSync(collageDir)) fs.mkdirSync(collageDir)

  // We are going to make a number of collages, so we'll loop through them
  const filenames = []
  let samples = 6
  if (settings.forceId) samples = 1
  let image = null
  if (samples === 1) image = await loadImage(path.join(thumbnailDir, thumbnails[0]))

  // Loop through the number of samples we want to make
  // but do it as a each loop so we can await the image loading
  // Make an array of the number of samples we want to make, numbered 0 to samples
  const sampleArray = [...Array(samples).keys()]
  for (const c of sampleArray) {
  // for (let c = 0; c < samples; c++) {
    // Do a proper inline shuffle of the thumbnails, without using a function
    for (let i = thumbnails.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = thumbnails[i]
      thumbnails[i] = thumbnails[j]
      thumbnails[j] = temp
    }
    let thumbnailPointer = 0
    // Clear the canvas
    ctx.clearRect(0, 0, settings.width, settings.height)
    // Save the state of the canvas
    ctx.save()
    // Translate the canvas to the centre of the canvas
    ctx.translate(settings.width / 2, settings.height / 2)
    // Rotate the canvas by the angle
    ctx.rotate(-settings.angle * Math.PI / 180)

    const startAt = -4
    const endAt = settings.columns + 4
    // If we are doing columns then...
    if (settings.type === 'columns') {
      // work out the new target size
      const targetWidth = Math.round(settings.width / settings.columns)
      const targetHeight = Math.round(targetWidth / dimensions.width * dimensions.height)
      let xOffset = 0
      if (settings.offset) xOffset = targetWidth / 2

      // The stagger values starts at the distance from startAt and zero in Absolute terms
      let stagger = startAt
      if (settings.step === 'half') stagger = startAt
      if (settings.step === 'third') stagger = startAt
      if (settings.step === 'quarter') stagger = startAt

      let stepDivider = 1
      if (settings.step === 'half') stepDivider = 2
      if (settings.step === 'third') stepDivider = 3
      if (settings.step === 'quarter') stepDivider = 4

      // We are going to loop through the columns...
      for (let i = startAt; i < endAt; i++) {
        let yOffset = 0
        // If we are doing offset columns then we want to offset the rows by half the height of the target on odd columns
        yOffset = targetHeight / stepDivider * stagger
        if (settings.offset) yOffset -= targetHeight / 2

        stagger++
        if (settings.step === null || settings.step === 'none') stagger = 0
        if (settings.step === 'half' && stagger > 1) stagger = 0
        if (settings.step === 'third' && stagger > 2) stagger = 0
        if (settings.step === 'quarter' && stagger > 3) stagger = 0

        // Now we are going to loop down the rows, which will be the same number as the columns
        for (let j = startAt; j < endAt; j++) {
          // Load in the image
          if (samples > 1) {
            image = await loadImage(path.join(thumbnailDir, thumbnails[thumbnailPointer]))
          }
          // Draw the image to the canvas, remembering to offset by half the width and height
          ctx.drawImage(image, i * targetWidth - (settings.width / 2) + xOffset, j * targetHeight - (settings.height / 2) + yOffset, targetWidth, targetHeight)
          // Increment the thumbnail pointer
          thumbnailPointer++
          // If we've run out of thumbnails then reset the pointer
          if (thumbnailPointer >= thumbnails.length) thumbnailPointer = 0
        }
      }
    }

    // If we are doing a video slide then do that
    if (settings.type === 'videoSlide') {
      // Colour in the right half of the canvas with an off grey
      ctx.fillStyle = '#E0E0E0'
      ctx.fillRect(0, -settings.height / 2, settings.width / 2, settings.height)
      // Now I want to work out the best way to fit the image into the right half of the canvas
      // I want it to either take up 90% of the height, so it doesn't take more than 90% of the width
      // If it can't do that then we want it to take up 85% of the width, so it doesn't take more than 90% of the height
      const smallerHeight = settings.height * 0.85
      const smallerWidth = settings.width / 2 * 0.85
      // First we set the smaller target height to be the smaller height
      let smallerTargetHeight = smallerHeight
      // Then calculate what the new width of the image would be if we used the smaller height
      // based on the dimensions of the image
      let smallerTargetWidth = Math.round(smallerTargetHeight / dimensions.height * dimensions.width)
      // If the smallerTargetWidth is greater than the smallerWidth then we need to use the smallerWidth
      if (smallerTargetWidth > smallerWidth) {
        smallerTargetWidth = smallerWidth
        smallerTargetHeight = Math.round(smallerWidth / dimensions.width * dimensions.height)
      }
      // Now that we have that draw a stroke line with rounded corners around the image where
      // the image is going to go, centered in the right half of the canvas
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.02'
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      // Work out where the top left corner of the image is going to be
      const topLeftX = (settings.width / 2 - smallerTargetWidth) / 2
      const topLeftY = ((settings.height - smallerTargetHeight) / 2) - (settings.height / 2)
      // Draw the rounded rectangle
      ctx.beginPath()
      ctx.moveTo(topLeftX, topLeftY)
      ctx.lineTo(topLeftX + smallerTargetWidth, topLeftY)
      ctx.lineTo(topLeftX + smallerTargetWidth, topLeftY + smallerTargetHeight)
      ctx.lineTo(topLeftX, topLeftY + smallerTargetHeight)
      ctx.lineTo(topLeftX, topLeftY)
      ctx.lineWidth = settings.width / 50
      // Now do the stroke 20 times, dividing the stroke width each time
      for (let i = 0; i < 40; i++) {
        ctx.stroke()
        ctx.lineWidth = ctx.lineWidth * 0.8
      }

      // Load in the image
      if (samples > 1) {
        image = await loadImage(path.join(thumbnailDir, thumbnails[thumbnailPointer]))
      }
      // Extract the id from the filename
      const id = parseInt(thumbnails[thumbnailPointer].split('_')[1])
      // Write the id to the canvas
      ctx.fillStyle = 'rgba(0, 0, 0, 1)'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'top'
      ctx.fillText(`${project.name} #${id}`, topLeftX + smallerTargetWidth, topLeftY + smallerTargetHeight + (settings.height * 0.01))

      // Draw the image to the canvas in the position of the rounded rectangle
      ctx.drawImage(image, topLeftX, topLeftY, smallerTargetWidth, smallerTargetHeight)
      // Increment the thumbnail pointer
      thumbnailPointer++
      // If we've run out of thumbnails then reset the pointer
      if (thumbnailPointer >= thumbnails.length) thumbnailPointer = 0
    }

    // Restore the canvas to the saved state
    ctx.restore()

    // Save the canvas out to a file as a png, with the value of c as the filename padded to 4 digits
    const filename = `${project.projectDir}-${c.toString().padStart(4, '0')}.png`
    filenames.push(`${filename}?v=${Math.random()}`)
    const collageFile = path.join(collageDir, filename)
    const out = fs.createWriteStream(collageFile)
    const stream = canvas.createPNGStream()
    // Stream it out but in a way where we can use await
    await new Promise((resolve, reject) => {
      stream.pipe(out)
      out.on('finish', resolve)
      out.on('error', reject)
    })
  }

  req.templateValues.settings = settings
  console.log(settings)
  req.templateValues.displayInColumns = settings.ratio <= 1
  req.templateValues.displayMoreThanOne = samples > 1

  // Add the project to the template values
  req.templateValues.project = project
  // Add the filenames to the template values
  req.templateValues.filenames = filenames
  return res.render('project/collage', req.templateValues)
}
