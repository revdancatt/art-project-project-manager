const fs = require('fs')
const path = require('path')

exports.index = async (req, res) => {
  // If a form has been posted here, process it
  if (req.method === 'POST') {
    // Check to see if we have 'projectName' in the body
    if (req.body.action === 'createProject' && req.body.projectName) {
      let projectsJSON = {}
      // set the data directory
      const dataDir = path.join(__dirname, '../../../data')
      // If it doesn't exist, create it
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir)
      // set the projects file
      const projectsFile = path.join(dataDir, 'projects.json')
      // If it exists load the contents into projectsJSON
      if (fs.existsSync(projectsFile)) projectsJSON = JSON.parse(fs.readFileSync(projectsFile, 'utf-8'))
      // If the name we have been given doesn't already exist, add it
      if (!projectsJSON[req.body.projectName]) {
        projectsJSON[req.body.projectName] = {}
        // Write the projectsJSON back to the file
        fs.writeFileSync(projectsFile, JSON.stringify(projectsJSON, null, 2))
      }
      // Redirect to the project page
      return res.redirect(`/project/${req.body.projectName}`)
    }
    // Check to see if we have an updateRevdancatt action and revdancattdotcom in the body
    if (req.body.action === 'updateRevdancatt' && req.body.revdancattdotcom) {
      let appDataJSON = {}
      // set the data directory
      const dataDir = path.join(__dirname, '../../../data')
      // If it doesn't exist, create it
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir)
      // set the appData file
      const appDataFile = path.join(dataDir, 'appData.json')
      // If it exists load the contents into appDataJSON
      if (fs.existsSync(appDataFile)) appDataJSON = JSON.parse(fs.readFileSync(appDataFile, 'utf-8'))
      // Set the redancattRootDir to the value we have been given
      appDataJSON.revdancattRootDir = req.body.revdancattdotcom
      // Write the appDataJSON back to the file
      fs.writeFileSync(appDataFile, JSON.stringify(appDataJSON, null, 2))
      // Redirect to the home page
      return res.redirect('/')
    }
    // Check to see if we have a downloads folder to update
    if (req.body.action === 'updateDownloadsFolder' && req.body.downloadsFolder) {
      let appDataJSON = {}
      // set the data directory
      const dataDir = path.join(__dirname, '../../../data')
      // If it doesn't exist, create it
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir)
      // set the appData file
      const appDataFile = path.join(dataDir, 'appData.json')
      // If it exists load the contents into appDataJSON
      if (fs.existsSync(appDataFile)) appDataJSON = JSON.parse(fs.readFileSync(appDataFile, 'utf-8'))
      // Set the redancattRootDir to the value we have been given
      appDataJSON.downloadsRootDir = req.body.downloadsFolder
      // Write the appDataJSON back to the file
      fs.writeFileSync(appDataFile, JSON.stringify(appDataJSON, null, 2))
      // Redirect to the home page
      return res.redirect('/')
    }
  }

  const dataDir = path.join(__dirname, '../../../data')
  const projectsFile = path.join(dataDir, 'projects.json')
  const appDataFile = path.join(dataDir, 'appData.json')
  let projectNames = []
  if (fs.existsSync(projectsFile)) projectNames = Object.keys(JSON.parse(fs.readFileSync(projectsFile, 'utf-8'))).sort()
  req.templateValues.projectNames = projectNames
  // If the appDataFile exists, load it into req.templateValues
  if (fs.existsSync(appDataFile)) req.templateValues.appData = JSON.parse(fs.readFileSync(appDataFile, 'utf-8'))
  return res.render('main/index', req.templateValues)
}
