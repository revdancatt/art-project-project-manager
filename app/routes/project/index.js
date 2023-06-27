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
    // If we've been passed the localDirectory then update the project object
    if (req.body.localDirectory) project.localDirectory = req.body.localDirectory
    // If we've been passed 'platform' and it's not 'Select platform' then update the project object
    if (req.body.platform && req.body.platform !== 'Select platform') project.platform = req.body.platform
    // If we have a projectId then update the project object
    if (req.body.projectId) project.projectId = req.body.projectId
    // Save the project object back to the projects file
    projectsJSON[req.params.projectName] = project
    // Write the projects file back to disk
    fs.writeFileSync(projectsFile, JSON.stringify(projectsJSON, null, 2), 'utf-8')
    // Redirect to the project page
    return res.redirect(`/project/${req.params.projectName}`)
  }

  // Add the project name to the project objects
  project.name = req.params.projectName

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
  }

  // Add the project to the template values
  req.templateValues.project = project

  return res.render('project/index', req.templateValues)
}
